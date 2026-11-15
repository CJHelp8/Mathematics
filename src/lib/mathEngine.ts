import { Difficulty, MathQuestion, SubMode } from '../types/game';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randNonZero(min: number, max: number): number {
  let v = 0;
  while (v === 0) {
    v = randInt(min, max);
  }
  return v;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatLinearTerm(coeff: number, variable: string, isFirst: boolean): string {
  if (coeff === 0) return '';
  const abs = Math.abs(coeff);
  const sign = coeff < 0 ? (isFirst ? '-' : ' - ') : isFirst ? '' : ' + ';
  const coefStr = abs === 1 ? '' : String(abs);
  return `${sign}${coefStr}${variable}`;
}

function formatConstTerm(val: number): string {
  if (val === 0) return '';
  return val > 0 ? ` + ${val}` : ` - ${Math.abs(val)}`;
}

export function generateBasicoQuestion(difficulty: Difficulty): MathQuestion {
  const op = pickRandom(['+', '-', '×', '÷'] as const);
  let a = 0;
  let b = 0;
  let ans = 0;

  if (difficulty === 'facil') {
    if (op === '+') {
      a = randInt(4, 45);
      b = randInt(4, 45);
      ans = a + b;
    } else if (op === '-') {
      a = randInt(12, 60);
      b = randInt(3, a);
      ans = a - b;
    } else if (op === '×') {
      a = randInt(2, 12);
      b = randInt(2, 12);
      ans = a * b;
    } else {
      b = randInt(2, 12);
      ans = randInt(2, 12);
      a = b * ans;
    }
  } else if (difficulty === 'normal') {
    if (op === '+') {
      a = randInt(25, 190);
      b = randInt(25, 190);
      ans = a + b;
    } else if (op === '-') {
      a = randInt(45, 220);
      b = randInt(15, a + 15);
      ans = a - b;
    } else if (op === '×') {
      a = randInt(6, 24);
      b = randInt(4, 16);
      ans = a * b;
    } else {
      b = randInt(4, 18);
      ans = randInt(4, 24);
      a = b * ans;
    }
  } else {
    // Dificil
    if (op === '+') {
      a = randInt(120, 850);
      b = randInt(120, 850);
      ans = a + b;
    } else if (op === '-') {
      a = randInt(100, 750);
      b = randInt(150, 820);
      ans = a - b;
    } else if (op === '×') {
      a = randInt(12, 48);
      b = randInt(11, 29);
      ans = a * b;
    } else {
      b = randInt(7, 29);
      ans = randInt(8, 36);
      a = b * ans;
    }
  }

  return {
    id: makeId(),
    prompt: `${a} ${op} ${b} = ?`,
    helperLabel: 'Digite o resultado numérico',
    kind: 'single',
    expectedValues: [ans],
    formattedAnswer: String(ans),
    eloPenaltyOnWrong: difficulty === 'dificil' ? 2 : 1,
  };
}

export function generateMentalQuestion(difficulty: Difficulty): MathQuestion {
  const op = pickRandom(['+', '-', '×'] as const);
  let a = 0;
  let b = 0;
  let ans = 0;
  let penalty = 1;

  if (difficulty === 'facil') {
    if (op === '+') {
      a = randInt(3, 30);
      b = randInt(3, 30);
      ans = a + b;
    } else if (op === '-') {
      a = randInt(12, 45);
      b = randInt(2, a - 1);
      ans = a - b;
    } else {
      a = randInt(2, 9);
      b = randInt(2, 9);
      ans = a * b;
    }
    penalty = 1;
  } else if (difficulty === 'normal') {
    if (op === '+') {
      a = randInt(14, 75);
      b = randInt(14, 75);
      ans = a + b;
      penalty = a + b > 100 ? 2 : 1;
    } else if (op === '-') {
      a = randInt(25, 95);
      b = randInt(8, a - 2);
      ans = a - b;
      penalty = 1;
    } else {
      a = randInt(4, 14);
      b = randInt(3, 12);
      ans = a * b;
      penalty = a > 9 && b > 9 ? 2 : 1;
    }
  } else {
    // Dificil
    if (op === '+') {
      a = randInt(35, 180);
      b = randInt(35, 180);
      ans = a + b;
      penalty = 2;
    } else if (op === '-') {
      a = randInt(40, 190);
      b = randInt(15, a + 25);
      ans = a - b;
      penalty = 2;
    } else {
      a = randInt(7, 19);
      b = randInt(6, 15);
      ans = a * b;
      penalty = 2;
    }
  }

  return {
    id: makeId(),
    prompt: `${a} ${op} ${b} = ?`,
    helperLabel: 'Cálculo rápido · 10s por questão',
    kind: 'single',
    expectedValues: [ans],
    formattedAnswer: String(ans),
    eloPenaltyOnWrong: penalty,
  };
}

function generateLinearOneVar(hardMode = false): MathQuestion {
  const x = hardMode ? randNonZero(-12, 15) : randNonZero(-8, 12);
  const a = hardMode ? randNonZero(-8, 9) : randInt(2, 8);
  const c = hardMode ? randNonZero(-18, 18) : randInt(-12, 15);
  const useBothSides = hardMode || Math.random() > 0.55;

  if (!useBothSides) {
    const rhs = a * x + c;
    const left = `${formatLinearTerm(a, 'x', true)}${formatConstTerm(c)}`;
    return {
      id: makeId(),
      prompt: `${left} = ${rhs}`,
      helperLabel: 'Encontre o valor de x',
      kind: 'single',
      expectedValues: [x],
      formattedAnswer: `x = ${x}`,
      eloPenaltyOnWrong: 1,
    };
  }

  let d = randNonZero(-5, 6);
  while (d === a) {
    d = randNonZero(-5, 6);
  }
  const e = a * x + c - d * x;
  const left = `${formatLinearTerm(a, 'x', true)}${formatConstTerm(c)}`;
  const right = `${formatLinearTerm(d, 'x', true)}${formatConstTerm(e)}`;

  return {
    id: makeId(),
    prompt: `${left} = ${right}`,
    helperLabel: 'Encontre o valor de x',
    kind: 'single',
    expectedValues: [x],
    formattedAnswer: `x = ${x}`,
    eloPenaltyOnWrong: 1,
  };
}

function generateLinearSystem2x2(hardMode = false): MathQuestion {
  const range = hardMode ? 9 : 6;
  const x = randNonZero(-range, range);
  const y = randNonZero(-range, range);

  let a1 = randNonZero(hardMode ? -5 : 1, 5);
  let b1 = randNonZero(-4, 4);
  let a2 = randNonZero(-4, 5);
  let b2 = randNonZero(-5, 5);

  while (a1 * b2 - a2 * b1 === 0) {
    a2 = randNonZero(-4, 5);
    b2 = randNonZero(-5, 5);
  }

  const c1 = a1 * x + b1 * y;
  const c2 = a2 * x + b2 * y;

  const eq1 = `${formatLinearTerm(a1, 'x', true)}${formatLinearTerm(b1, 'y', false)} = ${c1}`;
  const eq2 = `${formatLinearTerm(a2, 'x', true)}${formatLinearTerm(b2, 'y', false)} = ${c2}`;

  return {
    id: makeId(),
    prompt: eq1,
    secondaryPrompt: eq2,
    helperLabel: 'Resolva o sistema para (x, y)',
    kind: 'system_xy',
    expectedValues: [x, y],
    formattedAnswer: `x = ${x}, y = ${y}`,
    eloPenaltyOnWrong: 2,
  };
}

function generateQuadraticOneVar(): MathQuestion {
  const r1 = randInt(-7, 8);
  let r2 = randInt(-7, 8);
  while (r2 === r1) {
    r2 = randInt(-7, 8);
  }

  const a = Math.random() > 0.7 ? 2 : 1;
  const b = -a * (r1 + r2);
  const c = a * r1 * r2;

  const termA = a === 1 ? 'x²' : `${a}x²`;
  const termB = formatLinearTerm(b, 'x', false);
  const termC = formatConstTerm(c);

  const sorted = [r1, r2].sort((m, n) => m - n);

  return {
    id: makeId(),
    prompt: `${termA}${termB}${termC} = 0`,
    helperLabel: 'Informe as duas raízes (x₁ e x₂)',
    kind: 'quadratic_roots',
    expectedValues: sorted,
    formattedAnswer: `x₁ = ${sorted[0]}, x₂ = ${sorted[1]}`,
    eloPenaltyOnWrong: 2,
  };
}

function generateValidNonlinearSystem(): MathQuestion {
  // Unique solution system: x + y = S and x² - y² = D (with S != 0 => x - y = D / S)
  const x = randNonZero(-7, 8);
  let y = randNonZero(-7, 8);
  while (x + y === 0 || x === y) {
    y = randNonZero(-7, 8);
  }

  const s = x + y;
  const d = x * x - y * y;

  return {
    id: makeId(),
    prompt: `x + y = ${s}`,
    secondaryPrompt: `x² - y² = ${d}`,
    helperLabel: 'Sistema válido · encontre (x, y)',
    kind: 'system_xy',
    expectedValues: [x, y],
    formattedAnswer: `x = ${x}, y = ${y}`,
    eloPenaltyOnWrong: 2,
  };
}

export function generateEquacaoQuestion(difficulty: Difficulty): MathQuestion {
  if (difficulty === 'facil') {
    return generateLinearOneVar(false);
  }
  if (difficulty === 'normal') {
    return generateLinearSystem2x2(false);
  }
  // Dificil: mix of 1st degree (1 or 2 vars) and 2nd degree (1 or 2 vars valid systems)
  const roll = Math.random();
  if (roll < 0.45) return generateQuadraticOneVar();
  if (roll < 0.75) return generateValidNonlinearSystem();
  if (roll < 0.9) return generateLinearSystem2x2(true);
  return generateLinearOneVar(true);
}

export function generateQuestion(subMode: SubMode, difficulty: Difficulty): MathQuestion {
  if (subMode === 'basico') return generateBasicoQuestion(difficulty);
  if (subMode === 'mental') return generateMentalQuestion(difficulty);
  return generateEquacaoQuestion(difficulty);
}

/**
 * Parses numeric expressions like "-4", "+3", "3,5", "6/2", "x = -4"
 */
export function parseMathToken(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/^[xy]\s*[₁₂12]?\s*=\s*/i, '')
    .replace(',', '.')
    .replace(/\s+/g, '');

  if (!cleaned) return null;

  // Support simple fraction a/b
  const fracMatch = cleaned.match(/^([+-]?\d+(?:\.\d+)?)\/([+-]?\d+(?:\.\d+)?)$/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return num / den;
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

export function validateMathAnswer(
  question: MathQuestion,
  primaryInput: string,
  secondaryInput = ''
): boolean {
  if (question.kind === 'single') {
    const val = parseMathToken(primaryInput);
    if (val === null) return false;
    return nearlyEqual(val, question.expectedValues[0]);
  }

  let v1 = parseMathToken(primaryInput);
  let v2 = parseMathToken(secondaryInput);

  // Also allow entering both in the first input separated by comma/semicolon/space: e.g. "(3, -2)" or "3, -2"
  if (v1 === null || v2 === null) {
    const stripped = primaryInput.trim().replace(/^[({\[]|[)}\]]$/g, '');
    const parts = stripped.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      v1 = parseMathToken(parts[0]);
      v2 = parseMathToken(parts[1]);
    }
  }

  if (v1 === null || v2 === null) return false;

  if (question.kind === 'system_xy') {
    return nearlyEqual(v1, question.expectedValues[0]) && nearlyEqual(v2, question.expectedValues[1]);
  }

  // quadratic_roots: accept roots in any order
  const [r1, r2] = question.expectedValues;
  return (
    (nearlyEqual(v1, r1) && nearlyEqual(v2, r2)) ||
    (nearlyEqual(v1, r2) && nearlyEqual(v2, r1))
  );
}
