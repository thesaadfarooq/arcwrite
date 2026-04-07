import { describe, expect, it } from "vitest";
import { DEMO_TREES } from "@/lib/demo-stories";
import type { DemoNode, DemoTree } from "@/lib/demo-stories";

const VALID_CHOICE_TYPES = ["safe", "risky", "emotional", "chaotic"] as const;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

describe("DEMO_TREES export", () => {
  it("exports an object", () => {
    expect(typeof DEMO_TREES).toBe("object");
    expect(DEMO_TREES).not.toBeNull();
  });

  it("contains all 8 required keys", () => {
    const keys = Object.keys(DEMO_TREES);
    expect(keys).toContain("hero");
    expect(keys).toContain("features");
    expect(keys).toContain("fantasy");
    expect(keys).toContain("scifi");
    expect(keys).toContain("mystery");
    expect(keys).toContain("romance");
    expect(keys).toContain("horror");
    expect(keys).toContain("thriller");
    expect(keys).toHaveLength(8);
  });

  it("each tree has a non-empty title", () => {
    for (const [key, tree] of Object.entries(DEMO_TREES)) {
      expect(tree.title, `${key} should have a title`).toBeTruthy();
      expect(tree.title.length, `${key} title should be non-empty`).toBeGreaterThan(0);
    }
  });

  it("each tree has a non-empty nodes array", () => {
    for (const [key, tree] of Object.entries(DEMO_TREES)) {
      expect(Array.isArray(tree.nodes), `${key} nodes should be array`).toBe(true);
      expect(tree.nodes.length, `${key} should have nodes`).toBeGreaterThan(0);
    }
  });
});

describe("tree size requirements", () => {
  it("hero has 5-9 nodes", () => {
    const count = DEMO_TREES.hero.nodes.length;
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(9);
  });

  it("features has 10-15 nodes", () => {
    const count = DEMO_TREES.features.nodes.length;
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(15);
  });

  it("fantasy has 5-7 nodes", () => {
    const count = DEMO_TREES.fantasy.nodes.length;
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(7);
  });

  it("scifi has 5-7 nodes", () => {
    const count = DEMO_TREES.scifi.nodes.length;
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(7);
  });

  it("mystery has 5-7 nodes", () => {
    const count = DEMO_TREES.mystery.nodes.length;
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(7);
  });

  it("romance has 5-7 nodes", () => {
    const count = DEMO_TREES.romance.nodes.length;
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(7);
  });

  it("horror has 5-7 nodes", () => {
    const count = DEMO_TREES.horror.nodes.length;
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(7);
  });

  it("thriller has 5-7 nodes", () => {
    const count = DEMO_TREES.thriller.nodes.length;
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(7);
  });
});

describe("tree structure integrity", () => {
  for (const [key, tree] of Object.entries(DEMO_TREES) as [string, DemoTree][]) {
    describe(`tree: ${key}`, () => {
      it("has exactly one root node (parentId === null)", () => {
        const roots = tree.nodes.filter((n: DemoNode) => n.parentId === null);
        expect(roots, `${key} should have exactly one root`).toHaveLength(1);
      });

      it("all node ids are unique", () => {
        const ids = tree.nodes.map((n: DemoNode) => n.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size, `${key} should have unique ids`).toBe(ids.length);
      });

      it("all parentIds reference existing node ids", () => {
        const ids = new Set(tree.nodes.map((n: DemoNode) => n.id));
        for (const node of tree.nodes) {
          if (node.parentId !== null) {
            expect(
              ids.has(node.parentId),
              `${key}: parentId "${node.parentId}" on node "${node.id}" does not reference an existing node`
            ).toBe(true);
          }
        }
      });

      it("root node has null chosenLabel and null chosenType", () => {
        const root = tree.nodes.find((n: DemoNode) => n.parentId === null)!;
        expect(root.chosenLabel, `${key} root chosenLabel should be null`).toBeNull();
        expect(root.chosenType, `${key} root chosenType should be null`).toBeNull();
      });

      it("non-root nodes have a non-empty chosenLabel", () => {
        const nonRoots = tree.nodes.filter((n: DemoNode) => n.parentId !== null);
        for (const node of nonRoots) {
          expect(
            node.chosenLabel,
            `${key}: node "${node.id}" missing chosenLabel`
          ).toBeTruthy();
          expect(
            (node.chosenLabel as string).length,
            `${key}: node "${node.id}" chosenLabel is empty`
          ).toBeGreaterThan(0);
        }
      });

      it("non-root nodes have a valid chosenType", () => {
        const nonRoots = tree.nodes.filter((n: DemoNode) => n.parentId !== null);
        for (const node of nonRoots) {
          expect(
            VALID_CHOICE_TYPES.includes(node.chosenType as typeof VALID_CHOICE_TYPES[number]),
            `${key}: node "${node.id}" has invalid chosenType "${node.chosenType}"`
          ).toBe(true);
        }
      });

      it("all nodes have non-empty text", () => {
        for (const node of tree.nodes) {
          expect(node.text, `${key}: node "${node.id}" has empty text`).toBeTruthy();
          expect(
            node.text.trim().length,
            `${key}: node "${node.id}" text is empty`
          ).toBeGreaterThan(0);
        }
      });

      it("wordCount matches actual word count of text", () => {
        for (const node of tree.nodes) {
          const actual = countWords(node.text);
          expect(
            node.wordCount,
            `${key}: node "${node.id}" wordCount ${node.wordCount} does not match actual ${actual}`
          ).toBe(actual);
        }
      });

      it("startsChapter is a boolean on every node", () => {
        for (const node of tree.nodes) {
          expect(typeof node.startsChapter).toBe("boolean");
        }
      });

      it("all required fields are present on every node", () => {
        for (const node of tree.nodes) {
          expect(node).toHaveProperty("id");
          expect(node).toHaveProperty("parentId");
          expect(node).toHaveProperty("chosenLabel");
          expect(node).toHaveProperty("chosenType");
          expect(node).toHaveProperty("text");
          expect(node).toHaveProperty("wordCount");
          expect(node).toHaveProperty("startsChapter");
        }
      });
    });
  }
});

describe("hero tree content", () => {
  it("hero title is 'The Pale Book'", () => {
    expect(DEMO_TREES.hero.title).toBe("The Pale Book");
  });

  it("hero root text contains Kael descending stone steps", () => {
    const root = DEMO_TREES.hero.nodes.find((n: DemoNode) => n.parentId === null)!;
    expect(root.text.toLowerCase()).toMatch(/kael/i);
    expect(root.text.toLowerCase()).toMatch(/stone steps|steps/i);
  });

  it("hero has at least 2 branches from root", () => {
    const root = DEMO_TREES.hero.nodes.find((n: DemoNode) => n.parentId === null)!;
    const rootChildren = DEMO_TREES.hero.nodes.filter((n: DemoNode) => n.parentId === root.id);
    expect(rootChildren.length).toBeGreaterThanOrEqual(2);
  });
});

describe("features tree content", () => {
  it("features title is non-empty", () => {
    expect(DEMO_TREES.features.title).toBeTruthy();
  });

  it("features has at least 3 branches in the tree", () => {
    const nodeIds = new Set(DEMO_TREES.features.nodes.map((n: DemoNode) => n.id));
    // Count nodes that have at least one sibling (share a parent)
    const parentCounts: Record<string, number> = {};
    for (const node of DEMO_TREES.features.nodes) {
      if (node.parentId !== null) {
        parentCounts[node.parentId] = (parentCounts[node.parentId] ?? 0) + 1;
      }
    }
    const branchingParents = Object.values(parentCounts).filter((c) => c >= 2).length;
    expect(branchingParents, "features should have at least 3 branching nodes").toBeGreaterThanOrEqual(3);
    void nodeIds;
  });
});
