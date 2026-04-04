import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query, queryOne, withTransaction } from "../_db.js";
import { getAuthenticatedUser } from "../_lib/auth.js";

export const config = { runtime: "nodejs", maxDuration: 10 };

function getAuthorizationHeader(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" ? header : null;
}

/** Verify that a branch belongs to the authenticated user's story. */
async function verifyBranchOwnership(branchId: string, userId: string) {
  return queryOne<{ id: string; story_id: string; is_main: boolean; tip_node_id: string | null }>(
    `SELECT b.id, b.story_id, b.is_main, b.tip_node_id
     FROM branches b
     JOIN stories s ON s.id = b.story_id
     WHERE b.id = $1 AND s.user_id = $2`,
    [branchId, userId]
  );
}

/** GET ?story_id=X — list all branches for a story (ownership verified). */
async function handleList(storyId: string, userId: string, res: VercelResponse) {
  const story = await queryOne(
    "SELECT id FROM stories WHERE id = $1 AND user_id = $2",
    [storyId, userId]
  );
  if (!story) return res.status(404).json({ error: "Not found" });

  const branches = await query(
    `SELECT * FROM branches WHERE story_id = $1 ORDER BY created_at ASC`,
    [storyId]
  );
  return res.json(branches);
}

/**
 * POST ?action=create — create a new branch from a fork node.
 * Body: { story_id, fork_node_id, name? }
 *
 * The new branch's tip starts at the fork node (same node the user is
 * branching from). Nodes on the new branch are identified by setting
 * branch_id; at creation time no new nodes exist yet — the fork node
 * itself stays on whichever branch it already belongs to.
 */
async function handleCreate(
  body: Record<string, unknown>,
  userId: string,
  res: VercelResponse
) {
  const { story_id, fork_node_id, name } = body;

  if (typeof story_id !== "string" || typeof fork_node_id !== "string") {
    return res.status(400).json({ error: "story_id and fork_node_id are required" });
  }

  // Verify story ownership
  const story = await queryOne(
    "SELECT id FROM stories WHERE id = $1 AND user_id = $2",
    [story_id, userId]
  );
  if (!story) return res.status(404).json({ error: "Story not found" });

  // Verify fork node belongs to this story
  const forkNode = await queryOne<{ id: string }>(
    "SELECT id FROM story_nodes WHERE id = $1 AND story_id = $2",
    [fork_node_id, story_id]
  );
  if (!forkNode) return res.status(404).json({ error: "Fork node not found" });

  const branch = await queryOne(
    `INSERT INTO branches (story_id, fork_node_id, tip_node_id, name, is_main)
     VALUES ($1, $2, $2, $3, false)
     RETURNING *`,
    [story_id, fork_node_id, typeof name === "string" ? name : null]
  );

  return res.status(201).json(branch);
}

/**
 * POST ?action=promote&id=X — promote a branch to main.
 *
 * Steps:
 * 1. Demote current main branch (is_main = false).
 * 2. Promote this branch (is_main = true).
 * 3. Deactivate all currently active nodes for the story.
 * 4. Walk from the branch's tip_node_id to root and activate that path.
 */
async function handlePromote(branchId: string, userId: string, res: VercelResponse) {
  const branch = await verifyBranchOwnership(branchId, userId);
  if (!branch) return res.status(404).json({ error: "Not found" });

  if (branch.is_main) {
    return res.status(400).json({ error: "Branch is already main" });
  }

  if (!branch.tip_node_id) {
    return res.status(400).json({ error: "Branch has no tip node" });
  }

  await withTransaction(async (client) => {
    // Demote current main branch
    await client.query(
      "UPDATE branches SET is_main = false WHERE story_id = $1 AND is_main = true",
      [branch.story_id]
    );

    // Promote this branch
    await client.query(
      "UPDATE branches SET is_main = true WHERE id = $1",
      [branchId]
    );

    // Deactivate all active nodes for the story
    await client.query(
      "UPDATE story_nodes SET is_active = false WHERE story_id = $1 AND is_active = true",
      [branch.story_id]
    );

    // Fetch all nodes for the story to build the parent map
    const { rows } = await client.query<{ id: string; parent_id: string | null }>(
      "SELECT id, parent_id FROM story_nodes WHERE story_id = $1",
      [branch.story_id]
    );

    // Walk from tip to root, collecting path
    const parentMap = new Map(rows.map((row) => [row.id, row.parent_id]));
    const pathIds: string[] = [];
    let current: string | null = branch.tip_node_id;

    while (current) {
      pathIds.push(current);
      current = parentMap.get(current) ?? null;
    }

    // Activate the path
    if (pathIds.length > 0) {
      await client.query(
        "UPDATE story_nodes SET is_active = true WHERE story_id = $1 AND id = ANY($2)",
        [branch.story_id, pathIds]
      );
    }
  });

  return res.json({ success: true });
}

/** PATCH ?id=X — update branch name. Body: { name } */
async function handleUpdate(
  branchId: string,
  body: Record<string, unknown>,
  userId: string,
  res: VercelResponse
) {
  const { name } = body;
  if (typeof name !== "string") {
    return res.status(400).json({ error: "name (string) is required" });
  }

  const branch = await queryOne(
    `UPDATE branches b SET name = $1
     FROM stories s
     WHERE b.id = $2 AND b.story_id = s.id AND s.user_id = $3
     RETURNING b.*`,
    [name, branchId, userId]
  );

  if (!branch) return res.status(404).json({ error: "Not found" });
  return res.json(branch);
}

/**
 * DELETE ?id=X — delete a non-main branch and all of its owned nodes +
 * chapter_breaks.
 *
 * Only nodes whose branch_id matches this branch are deleted. The fork
 * node itself (which may belong to a different/main branch) is NOT deleted.
 */
async function handleDelete(branchId: string, userId: string, res: VercelResponse) {
  const branch = await verifyBranchOwnership(branchId, userId);
  if (!branch) return res.status(404).json({ error: "Not found" });

  if (branch.is_main) {
    return res.status(400).json({ error: "Cannot delete the main branch" });
  }

  await withTransaction(async (client) => {
    // Delete chapter_breaks for nodes owned by this branch (cascade-safe order)
    await client.query(
      `DELETE FROM chapter_breaks
       WHERE branch_id = $1`,
      [branchId]
    );

    // Delete nodes owned by this branch
    await client.query(
      "DELETE FROM story_nodes WHERE branch_id = $1",
      [branchId]
    );

    // Delete the branch record itself
    await client.query("DELETE FROM branches WHERE id = $1", [branchId]);
  });

  return res.json({ success: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getAuthenticatedUser(getAuthorizationHeader(req));
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const id = typeof req.query.id === "string" ? req.query.id : null;
    const action = typeof req.query.action === "string" ? req.query.action : null;

    // --- POST with action (no id in query for create; id required for promote) ---
    if (req.method === "POST") {
      if (action === "create") {
        return await handleCreate(req.body ?? {}, user.id, res);
      }
      if (action === "promote") {
        if (!id) return res.status(400).json({ error: "id required for promote" });
        return await handlePromote(id, user.id, res);
      }
      return res.status(400).json({ error: "Unknown action" });
    }

    // --- Operations that require ?id ---
    if (id) {
      if (req.method === "PATCH") return await handleUpdate(id, req.body ?? {}, user.id, res);
      if (req.method === "DELETE") return await handleDelete(id, user.id, res);
      return res.status(405).json({ error: "Method not allowed" });
    }

    // --- Collection / GET ---
    if (req.method === "GET") {
      const { story_id } = req.query;
      if (typeof story_id !== "string") {
        return res.status(400).json({ error: "story_id required" });
      }
      return await handleList(story_id, user.id, res);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[api/db/branches]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
