const COLUMN_LABEL_RE = /^[A-Z]+$/;

export const colLabelToIndex = (label: string): number => {
  let result = 0;
  for (let i = 0; i < label.length; i += 1) {
    const char = label[i];
    if (!COLUMN_LABEL_RE.test(char)) {
      throw new Error(`Invalid column label: ${label}`);
    }
    result = result * 26 + (char.charCodeAt(0) - 64);
  }
  return result - 1;
};

export const colIndexToLabel = (index: number): string => {
  if (index < 0) {
    throw new Error(`Invalid column index: ${index}`);
  }
  let result = '';
  let current = index + 1;
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
};

export const adjustFormulaReferences = (
  formula: string,
  rowDelta: number,
  colDelta: number
): string => {
  if (!formula.startsWith('=')) return formula;
  if (rowDelta === 0 && colDelta === 0) return formula;

  return formula.replace(/(^|[^A-Z0-9$])([A-Z]+)(\d+)/g, (match, prefix, colLabel, rowStr) => {
    const row = Number(rowStr);
    if (!Number.isFinite(row) || row <= 0) {
      return match;
    }
    try {
      const colIndex = colLabelToIndex(colLabel);
      const nextCol = colIndex + colDelta;
      const nextRow = row + rowDelta;
      if (nextCol < 0 || nextRow <= 0) {
        return match;
      }
      const nextLabel = colIndexToLabel(nextCol);
      return `${prefix}${nextLabel}${nextRow}`;
    } catch (error) {
      return match;
    }
  });
};

// Examples:
// adjustFormulaReferences("=B2/C2", 2, 0) => "=B4/C4"
// adjustFormulaReferences("=B2/C2", 0, 1) => "=C2/D2"

