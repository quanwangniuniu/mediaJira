from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import List, Optional, Tuple

from .models import Cell, ComputedCellType, Sheet, SheetColumn, SheetRow, CellValueType


class FormulaError(Exception):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass
class FormulaResult:
    computed_type: str
    computed_number: Optional[Decimal] = None
    computed_string: Optional[str] = None
    error_code: Optional[str] = None


@dataclass
class Token:
    type: str
    value: str


def evaluate_formula(raw_input: str, sheet: Sheet) -> FormulaResult:
    expression = raw_input[1:] if raw_input.startswith('=') else raw_input
    if not expression.strip():
        return FormulaResult(computed_type=ComputedCellType.ERROR, error_code="#REF!")

    try:
        tokens = _tokenize(expression)
        parser = _Parser(tokens, sheet)
        result = parser.parse_expression()
        if parser.has_more_tokens():
            raise FormulaError("#REF!")
        return FormulaResult(computed_type=ComputedCellType.NUMBER, computed_number=result)
    except FormulaError as exc:
        return FormulaResult(computed_type=ComputedCellType.ERROR, error_code=exc.code)
    except Exception:
        return FormulaResult(computed_type=ComputedCellType.ERROR, error_code="#VALUE!")


def _tokenize(expression: str) -> List[Token]:
    tokens: List[Token] = []
    index = 0
    length = len(expression)

    while index < length:
        char = expression[index]
        if char.isspace():
            index += 1
            continue

        if char in '+-*/()':
            token_type = 'LPAREN' if char == '(' else 'RPAREN' if char == ')' else 'OP'
            tokens.append(Token(token_type, char))
            index += 1
            continue

        if char.isdigit() or char == '.':
            start = index
            index += 1
            while index < length and (expression[index].isdigit() or expression[index] == '.'):
                index += 1
            tokens.append(Token('NUMBER', expression[start:index]))
            continue

        if char.isalpha():
            start = index
            index += 1
            while index < length and expression[index].isalpha():
                index += 1
            letters = expression[start:index]
            if index >= length or not expression[index].isdigit():
                raise FormulaError("#REF!")
            digits_start = index
            while index < length and expression[index].isdigit():
                index += 1
            digits = expression[digits_start:index]
            tokens.append(Token('REF', f"{letters}{digits}"))
            continue

        raise FormulaError("#REF!")

    return tokens


class _Parser:
    def __init__(self, tokens: List[Token], sheet: Sheet) -> None:
        self.tokens = tokens
        self.sheet = sheet
        self.index = 0

    def has_more_tokens(self) -> bool:
        return self.index < len(self.tokens)

    def _current_token(self) -> Optional[Token]:
        if self.index >= len(self.tokens):
            return None
        return self.tokens[self.index]

    def _consume(self, expected_type: Optional[str] = None) -> Token:
        token = self._current_token()
        if token is None:
            raise FormulaError("#REF!")
        if expected_type and token.type != expected_type:
            raise FormulaError("#REF!")
        self.index += 1
        return token

    def parse_expression(self) -> Decimal:
        value = self.parse_term()
        while True:
            token = self._current_token()
            if token is None or token.type != 'OP' or token.value not in '+-':
                break
            operator = token.value
            self._consume('OP')
            right = self.parse_term()
            value = value + right if operator == '+' else value - right
        return value

    def parse_term(self) -> Decimal:
        value = self.parse_factor()
        while True:
            token = self._current_token()
            if token is None or token.type != 'OP' or token.value not in '*/':
                break
            operator = token.value
            self._consume('OP')
            right = self.parse_factor()
            if operator == '*':
                value = value * right
            else:
                if right == 0:
                    raise FormulaError("#DIV/0!")
                value = value / right
        return value

    def parse_factor(self) -> Decimal:
        token = self._current_token()
        if token is None:
            raise FormulaError("#REF!")

        if token.type == 'OP' and token.value in '+-':
            operator = token.value
            self._consume('OP')
            value = self.parse_factor()
            return value if operator == '+' else -value

        if token.type == 'NUMBER':
            self._consume('NUMBER')
            try:
                return Decimal(token.value)
            except InvalidOperation as exc:
                raise FormulaError("#REF!") from exc

        if token.type == 'REF':
            self._consume('REF')
            return _resolve_reference(self.sheet, token.value)

        if token.type == 'LPAREN':
            self._consume('LPAREN')
            value = self.parse_expression()
            if self._current_token() is None or self._current_token().type != 'RPAREN':
                raise FormulaError("#REF!")
            self._consume('RPAREN')
            return value

        raise FormulaError("#REF!")


def _resolve_reference(sheet: Sheet, ref: str) -> Decimal:
    column_label, row_number = _split_reference(ref)
    column_index = _column_label_to_index(column_label)
    row_index = row_number - 1

    if row_index < 0 or column_index < 0:
        raise FormulaError("#REF!")

    if not SheetRow.objects.filter(sheet=sheet, position=row_index, is_deleted=False).exists():
        raise FormulaError("#REF!")

    if not SheetColumn.objects.filter(sheet=sheet, position=column_index, is_deleted=False).exists():
        raise FormulaError("#REF!")

    cell = Cell.objects.filter(
        sheet=sheet,
        row__position=row_index,
        column__position=column_index,
        is_deleted=False
    ).select_related('row', 'column').first()

    if cell is None:
        return Decimal(0)

    if cell.computed_type == ComputedCellType.NUMBER and cell.computed_number is not None:
        return cell.computed_number

    if cell.number_value is not None:
        return cell.number_value

    if cell.value_type == CellValueType.EMPTY or cell.computed_type == ComputedCellType.EMPTY:
        return Decimal(0)

    if (
        cell.value_type == CellValueType.FORMULA
        and cell.computed_type == ComputedCellType.EMPTY
        and cell.computed_number is None
    ):
        return Decimal(0)

    raise FormulaError("#VALUE!")


def _split_reference(ref: str) -> Tuple[str, int]:
    letters = []
    digits = []
    for char in ref:
        if char.isalpha() and not digits:
            letters.append(char)
        elif char.isdigit():
            digits.append(char)
        else:
            raise FormulaError("#REF!")
    if not letters or not digits:
        raise FormulaError("#REF!")
    return ''.join(letters), int(''.join(digits))


def _column_label_to_index(label: str) -> int:
    result = 0
    for char in label.upper():
        if not char.isalpha():
            raise FormulaError("#REF!")
        result = result * 26 + (ord(char) - ord('A') + 1)
    return result - 1


def extract_references(raw_input: str) -> List[str]:
    expression = raw_input[1:] if raw_input.startswith('=') else raw_input
    try:
        tokens = _tokenize(expression)
    except FormulaError:
        return []
    return [token.value for token in tokens if token.type == 'REF']


def reference_to_indexes(ref: str) -> Tuple[int, int]:
    column_label, row_number = _split_reference(ref)
    column_index = _column_label_to_index(column_label)
    row_index = row_number - 1
    if row_index < 0 or column_index < 0:
        raise FormulaError("#REF!")
    return row_index, column_index

