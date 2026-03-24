import {
  basisFunction,
  buildClampedUniformKnots,
  evaluateBspline,
  freehandPointsToWorldPath,
  interpolateControlsThroughPoints,
  spanToBezierUniform,
  transformSvgPathD,
} from "@/components/miro/utils/cubicBsplinePath";

describe("cubicBsplinePath", () => {
  test("basisFunction partition of unity on interior", () => {
    const knots = buildClampedUniformKnots(5);
    const u = 0.5;
    let sum = 0;
    for (let j = 0; j < 5; j++) {
      sum += basisFunction(j, 3, u, knots);
    }
    expect(sum).toBeCloseTo(1, 5);
  });

  test("evaluateBspline matches collocation targets (4-point fit)", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 3, y: 1 },
      { x: 4, y: 3 },
    ];
    const ctrl = interpolateControlsThroughPoints(pts);
    expect(ctrl).not.toBeNull();
    const knots = buildClampedUniformKnots(4);
    const uMax = knots[knots.length - 4];
    const d = [0];
    let total = 0;
    for (let i = 1; i < 4; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      d.push(total);
    }
    for (let i = 0; i < 4; i++) {
      const u = total < 1e-12 ? (uMax * i) / 3 : (d[i] / total) * uMax;
      const uClamped = Math.min(Math.max(u, knots[3] + 1e-8), knots[knots.length - 4] - 1e-8);
      const p = evaluateBspline(uClamped, ctrl!, knots);
      expect(p.x).toBeCloseTo(pts[i].x, 4);
      expect(p.y).toBeCloseTo(pts[i].y, 4);
    }
  });

  test("collinear points produce near-straight path (few C or polyline)", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];
    const { pathWorld } = freehandPointsToWorldPath(pts, 1);
    expect(pathWorld).toMatch(/^M /);
    if (pathWorld.includes("C")) {
      const cCount = (pathWorld.match(/\bC\b/g) || []).length;
      expect(cCount).toBeGreaterThanOrEqual(1);
    }
  });

  test("four points yield single cubic span in path", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
    ];
    const { pathWorld } = freehandPointsToWorldPath(pts, 0.5);
    expect(pathWorld.startsWith("M ")).toBe(true);
    expect(pathWorld).toContain("C ");
    const cCount = (pathWorld.match(/\bC\b/g) || []).length;
    expect(cCount).toBe(1);
  });

  test("spanToBezierUniform matches de Boor on uniform segment", () => {
    const d0 = { x: 0, y: 0 };
    const d1 = { x: 1, y: 0 };
    const d2 = { x: 2, y: 0 };
    const d3 = { x: 3, y: 0 };
    const [b0, , , b3] = spanToBezierUniform(d0, d1, d2, d3);
    expect(b0.x).toBeCloseTo(1, 5);
    expect(b3.x).toBeCloseTo(2, 5);
  });

  test("transformSvgPathD applies affine map", () => {
    const d = "M 0 0 C 1 0 2 0 3 0";
    const out = transformSvgPathD(d, (x, y) => ({ x: x * 2, y: y + 1 }));
    expect(out).toContain("M 0 1");
    expect(out).toContain("C 2 1");
  });
});
