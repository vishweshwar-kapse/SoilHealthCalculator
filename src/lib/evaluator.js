// Simple expression evaluator supporting +, -, *, /, ^ and parentheses
// Variables are alphanumeric + underscore and resolved from the provided env object
// No functions; extend as needed safely.

const isLetter = (ch) => /[A-Za-z_]/.test(ch)
const isDigit = (ch) => /[0-9]/.test(ch)

function tokenize(expr) {
  const tokens = []
  let i = 0
  while (i < expr.length) {
    const ch = expr[i]
    if (ch === ' ' || ch === '\t') { i++; continue }
    if ('+-*/()^'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue }
    if (isDigit(ch) || (ch === '.' && isDigit(expr[i+1]||''))) {
      let j = i+1
      while (j < expr.length && (isDigit(expr[j]) || expr[j] === '.')) j++
      tokens.push({ type: 'num', value: parseFloat(expr.slice(i, j)) })
      i = j; continue
    }
    if (isLetter(ch)) {
      let j = i+1
      while (j < expr.length && (isLetter(expr[j]) || isDigit(expr[j]))) j++
      tokens.push({ type: 'var', value: expr.slice(i, j) })
      i = j; continue
    }
    throw new Error(`Invalid character '${ch}' in expression`)
  }
  return tokens
}

const PREC = { '^': 4, '*': 3, '/': 3, '+': 2, '-': 2 }
const RIGHT_ASSOC = { '^': true }

function toRPN(tokens) {
  const out = []
  const stack = []
  for (const t of tokens) {
    if (t.type === 'num' || t.type === 'var') out.push(t)
    else if (t.type === 'op' && t.value === '(') stack.push(t)
    else if (t.type === 'op' && t.value === ')') {
      while (stack.length && stack[stack.length-1].value !== '(') out.push(stack.pop())
      if (!stack.length) throw new Error('Mismatched parentheses')
      stack.pop()
    } else if (t.type === 'op') {
      while (stack.length) {
        const top = stack[stack.length-1]
        if (top.type === 'op' && top.value !== '(' &&
            (PREC[top.value] > PREC[t.value] || (PREC[top.value] === PREC[t.value] && !RIGHT_ASSOC[t.value]))) {
          out.push(stack.pop())
        } else break
      }
      stack.push(t)
    }
  }
  while (stack.length) {
    const s = stack.pop()
    if (s.value === '(') throw new Error('Mismatched parentheses')
    out.push(s)
  }
  return out
}

export function evalExpression(expr, env) {
  if (!expr || typeof expr !== 'string') return NaN
  const tokens = toRPN(tokenize(expr))
  const st = []
  for (const t of tokens) {
    if (t.type === 'num') st.push(t.value)
    else if (t.type === 'var') {
      const v = env[t.value]
      st.push(typeof v === 'number' ? v : NaN)
    } else if (t.type === 'op') {
      const b = st.pop(); const a = st.pop()
      switch (t.value) {
        case '+': st.push((a ?? NaN) + (b ?? NaN)); break
        case '-': st.push((a ?? NaN) - (b ?? NaN)); break
        case '*': st.push((a ?? NaN) * (b ?? NaN)); break
        case '/': st.push((a ?? NaN) / (b ?? NaN)); break
        case '^': st.push(Math.pow((a ?? NaN), (b ?? NaN))); break
        default: st.push(NaN)
      }
    }
  }
  return st.length ? st[0] : NaN
}

export function computeValueForParam(paramId, paramsById, inputValues, memo = {}, visiting = new Set()) {
  if (memo[paramId] !== undefined) return memo[paramId]
  const p = paramsById[paramId]
  if (!p) return memo[paramId] = NaN
  if (p.type === 'input' || !p.expression) {
    const raw = inputValues[paramId]
    const num = raw === '' || raw === undefined || raw === null ? NaN : Number(raw)
    return memo[paramId] = (isNaN(num) ? NaN : num)
  }
  if (visiting.has(paramId)) return memo[paramId] = NaN // cycle
  visiting.add(paramId)
  // Build env from referenced vars (all ids in paramsById)
  const env = {}
  const varRegex = /[A-Za-z_][A-Za-z0-9_]*/g
  const seen = new Set()
  for (const m of p.expression.matchAll(varRegex)) {
    const name = m[0]
    if (seen.has(name)) continue; seen.add(name)
    if (paramsById[name]) env[name] = computeValueForParam(name, paramsById, inputValues, memo, visiting)
  }
  const val = evalExpression(p.expression, env)
  visiting.delete(paramId)
  return memo[paramId] = val
}

export function computeAllValues(parameters, inputValues) {
  const byId = Object.fromEntries(parameters.map(p => [p.id, p]))
  const memo = {}
  for (const p of parameters) computeValueForParam(p.id, byId, inputValues, memo, new Set())
  return memo
}

export function formatRanges(ranges) {
  if (!Array.isArray(ranges)) return ''
  return ranges.map(r => {
    // Categorical option
    if (r.value !== undefined && r.value !== null && r.value !== '') {
      const head = r.label ?? ''
      const tail = String(r.value)
      return head ? `${head}: ${tail}` : tail
    }
    // Numeric range
    const a = r.min ?? '-∞'
    const b = r.max ?? '+∞'
    return `${r.label ?? ''}: ${a} – ${b}`.trim()
  }).join('\n')
}

const defaultSeverity = (label = '') => {
  const L = label.toLowerCase()
  if (/(optimal|good|healthy)/.test(L)) return 0
  if (/(moderate|border|medium|fair)/.test(L)) return 1
  return 2
}

export function evaluateValueAgainstRanges(value, ranges = []) {
  if (value === undefined || value === null) return null
  // Categorical value (string): match on r.value
  if (typeof value === 'string') {
    const v = value.trim()
    if (v === '') return null
    for (const r of ranges) {
      if (r && r.value !== undefined && r.value !== null && String(r.value) === v) {
        return {
          label: r.label || String(r.value) || 'Uncategorized',
          message: r.message || r.label || String(r.value) || '',
          severity: r.severity ?? defaultSeverity(r.label)
        }
      }
    }
    return { label: 'Out of range', message: 'Value not in options', severity: 1 }
  }
  // Numeric value
  if (isNaN(value)) return null
  for (const r of ranges) {
    const minOk = r.min === null || r.min === undefined || value >= r.min
    const maxOk = r.max === null || r.max === undefined || value <= r.max
    if (minOk && maxOk) {
      return {
        label: r.label || 'Uncategorized',
        message: r.message || r.label || '',
        severity: r.severity ?? defaultSeverity(r.label)
      }
    }
  }
  return { label: 'Out of range', message: 'Value outside defined ranges', severity: 1 }
}
