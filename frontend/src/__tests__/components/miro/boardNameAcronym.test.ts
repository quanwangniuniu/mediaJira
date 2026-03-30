import { boardNameToAcronym } from "@/components/miro/utils/boardNameAcronym";

describe("boardNameToAcronym", () => {
  it("uses initials from multiple words (spaces)", () => {
    expect(boardNameToAcronym("Magic Keyboard")).toBe("MK");
  });

  it("uses initials from snake_case", () => {
    expect(boardNameToAcronym("study_routine")).toBe("SR");
  });

  it("uses first two letters for a single short token", () => {
    expect(boardNameToAcronym("ab")).toBe("AB");
  });

  it("truncates long single word to two chars", () => {
    expect(boardNameToAcronym("Planning")).toBe("PL");
  });

  it("returns placeholder for empty", () => {
    expect(boardNameToAcronym("")).toBe("?");
    expect(boardNameToAcronym("   ")).toBe("?");
  });
});
