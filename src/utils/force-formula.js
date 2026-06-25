/**
 * @param {string} formula
 * @param {number} force
 * @returns {number}
 */
export function evaluateForceFormula(formula, force) {
  if (!formula || typeof formula !== 'string') return 0;
  const expr = formula.replace(/F/gi, String(force));
  if (!/^[\d\s+\-*/()]+$/.test(expr)) return 0;
  try {
    const result = parseExpression(expr.replace(/\s+/g, ''), { pos: 0 });
    return Math.max(0, Math.floor(result));
  } catch {
    return 0;
  }
}

/** @param {string} s @param {{ pos: number }} ctx */
function parseExpression(s, ctx) {
  let left = parseTerm(s, ctx);
  while (ctx.pos < s.length && (s[ctx.pos] === '+' || s[ctx.pos] === '-')) {
    const op = s[ctx.pos++];
    const right = parseTerm(s, ctx);
    left = op === '+' ? left + right : left - right;
  }
  return left;
}

/** @param {string} s @param {{ pos: number }} ctx */
function parseTerm(s, ctx) {
  let left = parseFactor(s, ctx);
  while (ctx.pos < s.length && (s[ctx.pos] === '*' || s[ctx.pos] === '/')) {
    const op = s[ctx.pos++];
    const right = parseFactor(s, ctx);
    left = op === '*' ? left * right : left / right;
  }
  return left;
}

/** @param {string} s @param {{ pos: number }} ctx */
function parseFactor(s, ctx) {
  if (s[ctx.pos] === '(') {
    ctx.pos++;
    const val = parseExpression(s, ctx);
    if (s[ctx.pos] === ')') ctx.pos++;
    return val;
  }
  const match = s.slice(ctx.pos).match(/^-?\d+/);
  if (!match) return 0;
  ctx.pos += match[0].length;
  return parseInt(match[0], 10);
}

/**
 * @param {{ value: number, formula: string }} attr
 * @param {number} force
 * @returns {number}
 */
export function resolveAttribute(attr, force) {
  if (attr.formula) return evaluateForceFormula(attr.formula, force);
  return attr.value ?? 0;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isForceFormula(value) {
  if (typeof value !== 'string') return false;
  return /F/i.test(value);
}
