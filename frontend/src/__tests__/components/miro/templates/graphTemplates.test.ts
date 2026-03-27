import { getGraphTemplate, listGraphTemplates } from "@/components/miro/templates/graphTemplates";

describe("graphTemplates", () => {
  test("lists at least two templates", () => {
    const list = listGraphTemplates();
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  test("mind_map has nodes and edges", () => {
    const t = getGraphTemplate("mind_map");
    expect(t.nodes.length).toBeGreaterThan(0);
    expect(t.edges.length).toBeGreaterThan(0);
  });

  test("flowchart has nodes and edges", () => {
    const t = getGraphTemplate("flowchart");
    expect(t.nodes.length).toBeGreaterThan(0);
    expect(t.edges.length).toBeGreaterThan(0);
  });
});

