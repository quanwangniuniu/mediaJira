const A1_REGEX = /^([A-Z]+)(\d+)$/i;

export const columnIndexToLabel = (col: number) => {
  let label = '';
  let current = col;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label || 'A';
};

export const columnLabelToIndex = (label: string) => {
  const normalized = label.toUpperCase();
  let result = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    if (code < 65 || code > 90) {
      return null;
    }
    result = result * 26 + (code - 64);
  }
  return result;
};

export const rowColToA1 = (row: number, col: number) => {
  if (row <= 0 || col <= 0) return null;
  return `${columnIndexToLabel(col)}${row}`;
};

export const parseA1 = (value: string) => {
  const match = value.trim().match(A1_REGEX);
  if (!match) return null;
  const col = columnLabelToIndex(match[1]);
  const row = Number(match[2]);
  if (!col || Number.isNaN(row) || row <= 0) return null;
  return { row, col };
};

