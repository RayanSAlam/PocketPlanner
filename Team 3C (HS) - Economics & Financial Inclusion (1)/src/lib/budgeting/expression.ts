// Formula-lite for budget cells: plain numbers, basic arithmetic
// (+ - * / and parens), and "N% of income". Deliberately hand-written
// instead of eval()/Function() — this runs on arbitrary user keystrokes,
// and a tiny recursive-descent parser costs little more than a regex while
// staying safe by construction (it can only ever produce a number, never
// execute anything).

const PERCENT_OF_INCOME = /^(-?\d+(?:\.\d+)?)\s*%\s*of\s+income$/i;

export function evaluateBudgetExpression(input: string, income: number): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const percentMatch = PERCENT_OF_INCOME.exec(trimmed);
  if (percentMatch) {
    const pct = Number(percentMatch[1]);
    if (Number.isNaN(pct)) return null;
    return round2((pct / 100) * income);
  }

  const cleaned = trimmed.replace(/^\$/, "").replace(/,/g, "");

  const plain = Number(cleaned);
  if (cleaned.length > 0 && !Number.isNaN(plain) && /^-?\d*\.?\d+$/.test(cleaned)) {
    return round2(plain);
  }

  const result = parseArithmetic(cleaned);
  return result === null ? null : round2(result);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Recursive-descent: expr := term (('+' | '-') term)*
//                     term := factor (('*' | '/') factor)*
//                     factor := number | '(' expr ')' | '-' factor
function parseArithmetic(source: string): number | null {
  let pos = 0;

  const skipSpace = () => {
    while (pos < source.length && /\s/.test(source[pos])) pos++;
  };

  const parseNumber = (): number | null => {
    skipSpace();
    const start = pos;
    if (source[pos] === "-") pos++;
    let sawDigit = false;
    while (pos < source.length && /[0-9]/.test(source[pos])) {
      pos++;
      sawDigit = true;
    }
    if (source[pos] === ".") {
      pos++;
      while (pos < source.length && /[0-9]/.test(source[pos])) {
        pos++;
        sawDigit = true;
      }
    }
    if (!sawDigit) {
      pos = start;
      return null;
    }
    return Number(source.slice(start, pos));
  };

  const parseFactor = (): number | null => {
    skipSpace();
    if (source[pos] === "(") {
      pos++;
      const value = parseExpr();
      skipSpace();
      if (value === null || source[pos] !== ")") return null;
      pos++;
      return value;
    }
    if (source[pos] === "-") {
      pos++;
      const value = parseFactor();
      return value === null ? null : -value;
    }
    return parseNumber();
  };

  const parseTerm = (): number | null => {
    let value = parseFactor();
    if (value === null) return null;
    for (;;) {
      skipSpace();
      const op = source[pos];
      if (op !== "*" && op !== "/") break;
      pos++;
      const rhs = parseFactor();
      if (rhs === null) return null;
      if (op === "*") value *= rhs;
      else {
        if (rhs === 0) return null;
        value /= rhs;
      }
    }
    return value;
  };

  const parseExpr = (): number | null => {
    let value = parseTerm();
    if (value === null) return null;
    for (;;) {
      skipSpace();
      const op = source[pos];
      if (op !== "+" && op !== "-") break;
      pos++;
      const rhs = parseTerm();
      if (rhs === null) return null;
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  };

  const result = parseExpr();
  skipSpace();
  if (result === null || pos !== source.length) return null;
  return result;
}

// A tiny "fx" hint shows when the raw text looks like a formula rather
// than a plain typed number — used to decide whether to show the hint UI.
export function looksLikeFormula(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length === 0) return false;
  if (PERCENT_OF_INCOME.test(trimmed)) return true;
  return /[+\-*/()]/.test(trimmed.replace(/^-/, "").replace(/^\$/, ""));
}
