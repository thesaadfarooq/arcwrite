import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureProfile } from "../_auth.js";
import { query, queryOne, withTransaction } from "../_db.js";
import { getAuthenticatedUser } from "../_lib/auth.js";

export const config = { runtime: "nodejs", maxDuration: 10 };

function getAuthorizationHeader(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" ? header : null;
}

async function verifyNodeOwnership(nodeId: string, userId: string) {
  return queryOne<{ id: string; story_id: string; parent_id: string | null }>(
    `SELECT sn.id, sn.story_id, sn.parent_id FROM story_nodes sn
     JOIN stories s ON s.id = sn.story_id
     WHERE sn.id = $1 AND s.user_id = $2`,
    [nodeId, userId]
  );
}

async function handleJump(id: string, userId: string, res: VercelResponse) {
  const node = await verifyNodeOwnership(id, userId);
  if (!node) return res.status(404).json({ error: "Not found" });

  await withTransaction(async (client) => {
    await client.query(
      "UPDATE story_nodes SET is_active = false WHERE story_id = $1 AND is_active = true",
      [node.story_id]
    );

    const { rows } = await client.query<{ id: string; parent_id: string | null }>(
      "SELECT id, parent_id FROM story_nodes WHERE story_id = $1",
      [node.story_id]
    );

    const parentMap = new Map(rows.map((row) => [row.id, row.parent_id]));
    const pathIds: string[] = [];
    let current: string | null = id;

    while (current) {
      pathIds.push(current);
      current = parentMap.get(current) ?? null;
    }

    if (pathIds.length > 0) {
      await client.query(
        "UPDATE story_nodes SET is_active = true WHERE story_id = $1 AND id = ANY($2)",
        [node.story_id, pathIds]
      );
    }
  });

  return res.json({ success: true });
}

async function handleMerge(id: string, userId: string, res: VercelResponse) {
  const owned = await verifyNodeOwnership(id, userId);
  if (!owned) return res.status(404).json({ error: "Not found" });

  const result = await withTransaction(async (client) => {
    const nodeResult = await client.query(
      "SELECT * FROM story_nodes WHERE id = $1",
      [id]
    );
    const node = nodeResult.rows[0];

    if (!node?.parent_id) return null;

    const parentResult = await client.query(
      "SELECT * FROM story_nodes WHERE id = $1",
      [node.parent_id]
    );
    const parent = parentResult.rows[0];
    if (!parent) throw new Error("Parent not found");

    await client.query(
      `UPDATE story_nodes
       SET text = $1, summary = $2, story_state = $3, choices = $4
       WHERE id = $5`,
      [
        [parent.text, node.text].filter(Boolean).join("\n\n"),
        node.summary || parent.summary,
        JSON.stringify(node.story_state || parent.story_state || null),
        JSON.stringify(node.choices || parent.choices || null),
        parent.id,
      ]
    );

    const grandchildren = await client.query(
      "SELECT id FROM story_nodes WHERE parent_id = $1",
      [id]
    );
    if (grandchildren.rows.length > 0) {
      await client.query(
        "UPDATE story_nodes SET parent_id = $1 WHERE parent_id = $2",
        [parent.id, id]
      );
    }

    await client.query("DELETE FROM story_nodes WHERE id = $1", [id]);
    return { success: true, parentId: parent.id };
  });

  if (!result) return res.status(400).json({ error: "Cannot merge root node" });
  return res.json(result);
}

async function handleSplit(
  id: string,
  userId: string,
  body: { position?: number },
  res: VercelResponse
) {
  const { position } = body;
  if (typeof position !== "number") {
    return res.status(400).json({ error: "position required" });
  }

  const owned = await verifyNodeOwnership(id, userId);
  if (!owned) return res.status(404).json({ error: "Not found" });

  let newNode;
  try {
    newNode = await withTransaction(async (client) => {
      const { rows } = await client.query(
        "SELECT * FROM story_nodes WHERE id = $1",
        [id]
      );
      const node = rows[0];
      if (!node) throw new Error("Node not found");

      const paragraphs = (node.text || "").split("\n\n").filter(Boolean);
      if (position <= 0 || position >= paragraphs.length) {
        throw new Error("Invalid split position");
      }

      const textBefore = paragraphs.slice(0, position).join("\n\n");
      const textAfter = paragraphs.slice(position).join("\n\n");

      await client.query("UPDATE story_nodes SET text = $1 WHERE id = $2", [textBefore, id]);

      // Use a timestamp just after the original node so created_at ordering
      // stays consistent with tree order even before the tree-walk sort.
      const splitTimestamp = new Date(new Date(node.created_at).getTime() + 1).toISOString();

      const inserted = await client.query(
        `INSERT INTO story_nodes (
           story_id, parent_id, text, summary, story_state, choices,
           chosen_option, starts_chapter, is_active, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, NULL, true, $7, $8)
         RETURNING *`,
        [
          node.story_id,
          id,
          textAfter,
          node.summary,
          JSON.stringify(node.story_state ?? null),
          JSON.stringify(node.choices ?? null),
          node.is_active,
          splitTimestamp,
        ]
      );
      const createdNode = inserted.rows[0];

      const existingChildren = await client.query(
        "SELECT id FROM story_nodes WHERE parent_id = $1 AND id != $2",
        [id, createdNode.id]
      );
      if (existingChildren.rows.length > 0) {
        await client.query(
          "UPDATE story_nodes SET parent_id = $1 WHERE parent_id = $2 AND id != $1",
          [createdNode.id, id]
        );
      }

      await client.query(
        "UPDATE story_nodes SET choices = '[]'::jsonb, summary = NULL WHERE id = $1",
        [id]
      );

      return createdNode;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid split position") {
      return res.status(400).json({ error: "Invalid split position" });
    }
    throw error;
  }

  return res.json(newNode);
}

async function handleSubtreeDelete(id: string, userId: string, res: VercelResponse) {
  const node = await queryOne<{ story_id: string; parent_id: string | null }>(
    `SELECT sn.story_id, sn.parent_id FROM story_nodes sn
     JOIN stories s ON s.id = sn.story_id
     WHERE sn.id = $1 AND s.user_id = $2`,
    [id, userId]
  );
  if (!node) return res.status(404).json({ error: "Not found" });

  await withTransaction(async (client) => {
    const allNodesResult = await client.query<{ id: string; parent_id: string | null }>(
      "SELECT id, parent_id FROM story_nodes WHERE story_id = $1",
      [node.story_id]
    );

    const childrenMap = new Map<string, string[]>();
    for (const row of allNodesResult.rows) {
      if (!row.parent_id) continue;
      const children = childrenMap.get(row.parent_id) ?? [];
      children.push(row.id);
      childrenMap.set(row.parent_id, children);
    }

    const toDelete: string[] = [id];
    const queue: string[] = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childrenMap.get(current) ?? [];
      for (const child of children) {
        toDelete.push(child);
        queue.push(child);
      }
    }

    await client.query(
      "DELETE FROM story_nodes WHERE story_id = $1 AND id = ANY($2)",
      [node.story_id, toDelete]
    );

    if (!node.parent_id) return;

    await client.query(
      "UPDATE story_nodes SET is_active = false WHERE story_id = $1 AND is_active = true",
      [node.story_id]
    );

    const remainingResult = await client.query<{ id: string; parent_id: string | null }>(
      "SELECT id, parent_id FROM story_nodes WHERE story_id = $1",
      [node.story_id]
    );

    const parentMap = new Map(remainingResult.rows.map((row) => [row.id, row.parent_id]));
    const pathIds: string[] = [];
    let current: string | null = node.parent_id;
    while (current) {
      pathIds.push(current);
      current = parentMap.get(current) ?? null;
    }

    if (pathIds.length > 0) {
      await client.query(
        "UPDATE story_nodes SET is_active = true WHERE story_id = $1 AND id = ANY($2)",
        [node.story_id, pathIds]
      );
    }
  });

  return res.json({ success: true, parentId: node.parent_id });
}

async function handleUpdate(
  id: string,
  userId: string,
  body: Record<string, unknown>,
  res: VercelResponse
) {
  const owned = await verifyNodeOwnership(id, userId);
  if (!owned) return res.status(404).json({ error: "Not found" });

  const allowedFields = [
    "text", "summary", "choices", "story_state", "is_active",
    "chosen_option", "starts_chapter", "chapter_title", "parent_id",
  ] as const;

  const sets: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  for (const field of allowedFields) {
    if (body?.[field] !== undefined) {
      const isJsonField =
        field === "choices" || field === "story_state" || field === "chosen_option";
      sets.push(`${field} = $${index}`);
      values.push(
        isJsonField && body[field] !== null
          ? JSON.stringify(body[field])
          : body[field]
      );
      index += 1;
    }
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  values.push(id, userId);
  const node = await queryOne(
    `UPDATE story_nodes sn SET ${sets.join(", ")}
     FROM stories s
     WHERE sn.id = $${index} AND sn.story_id = s.id AND s.user_id = $${index + 1}
     RETURNING sn.*`,
    values
  );

  if (!node) return res.status(404).json({ error: "Not found" });
  return res.json(node);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getAuthenticatedUser(getAuthorizationHeader(req));
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    await ensureProfile(user.id);

    const id = typeof req.query.id === "string" ? req.query.id : null;
    const action = typeof req.query.action === "string" ? req.query.action : null;

    // Operations on a specific node
    if (id) {
      if (req.method === "POST" && action === "jump") return await handleJump(id, user.id, res);
      if (req.method === "POST" && action === "merge") return await handleMerge(id, user.id, res);
      if (req.method === "POST" && action === "split") return await handleSplit(id, user.id, req.body ?? {}, res);
      if (req.method === "DELETE" && action === "subtree") return await handleSubtreeDelete(id, user.id, res);
      if (req.method === "PATCH") return await handleUpdate(id, user.id, req.body ?? {}, res);
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Collection operations (no id)
    if (req.method === "GET") {
      const { story_id, active } = req.query;
      if (typeof story_id !== "string") {
        return res.status(400).json({ error: "story_id required" });
      }

      const story = await queryOne(
        "SELECT id FROM stories WHERE id = $1 AND user_id = $2",
        [story_id, user.id]
      );
      if (!story) return res.status(404).json({ error: "Not found" });

      let sql = "SELECT * FROM story_nodes WHERE story_id = $1";
      if (active !== "all") sql += " AND is_active = true";
      sql += " ORDER BY created_at ASC";

      const nodes = await query(sql, [story_id]);

      // Sort by tree walk (root → leaf) so split-inserted nodes appear in
      // the correct position regardless of their created_at timestamp.
      const childMap = new Map<string | null, typeof nodes[number]>();
      for (const n of nodes) {
        childMap.set(n.parent_id ?? null, n);
      }
      const sorted: typeof nodes = [];
      let current = childMap.get(null); // root has no parent
      while (current) {
        sorted.push(current);
        current = childMap.get(current.id);
      }
      // Fall back to the original order if the tree walk didn't cover all
      // nodes (e.g. "all" mode returns branches with multiple children).
      return res.json(sorted.length === nodes.length ? sorted : nodes);
    }

    if (req.method === "POST") {
      const {
        story_id, parent_id, text, summary, story_state,
        choices, chosen_option, starts_chapter, branch_id,
      } = req.body ?? {};

      if (typeof story_id !== "string") {
        return res.status(400).json({ error: "story_id required" });
      }

      const story = await queryOne(
        "SELECT id FROM stories WHERE id = $1 AND user_id = $2",
        [story_id, user.id]
      );
      if (!story) return res.status(404).json({ error: "Not found" });

      const isRoot = !parent_id;
      const node = await queryOne(
        `INSERT INTO story_nodes (
           story_id, parent_id, text, summary, story_state,
           choices, chosen_option, starts_chapter, branch_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          story_id,
          parent_id || null,
          typeof text === "string" ? text : "",
          summary || null,
          JSON.stringify(story_state ?? {}),
          JSON.stringify(choices ?? []),
          chosen_option == null ? null : JSON.stringify(chosen_option),
          starts_chapter ?? isRoot,
          branch_id || null,
        ]
      );
      if (node) {
        if (branch_id) {
          await queryOne(
            "UPDATE branches SET tip_node_id = $1 WHERE id = $2",
            [node.id, branch_id]
          );
        } else {
          // Update main branch tip when creating nodes on the main path
          await queryOne(
            "UPDATE branches SET tip_node_id = $1 WHERE story_id = $2 AND is_main = true",
            [node.id, story_id]
          );
        }
      }
      return res.status(201).json(node);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[api/db/nodes]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
