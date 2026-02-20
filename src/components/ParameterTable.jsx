import React from 'react'
import { formatRanges, evaluateValueAgainstRanges } from '../lib/evaluator.js'

function severityClass(s) { return s === 0 ? 'ok' : s === 1 ? 'warn' : 'bad' }

export default function ParameterTable({ parameters, values, computed, onChangeValue }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="col-param">Soil Health Parameter</th>
            <th className="col-desc">Parameter Description</th>
            <th className="col-range">Health Range of Parameter</th>
            <th className="col-value">Current Test Value</th>
            <th className="col-eval">Evaluation</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map(p => {
            const v = p.type === 'computed' ? computed[p.id] : (values[p.id] ?? '')
            const valNum = p.type === 'computed' ? v : (v === '' ? NaN : Number(v))
            const evaln = evaluateValueAgainstRanges(valNum, p.ranges)
            return (
              <tr key={p.id}>
                <td data-label="Soil Health Parameter"><strong>{p.name || p.id}</strong>{p.unit ? ` (${p.unit})` : ''}{p.type === 'computed' ? ' • computed' : ''}</td>
                <td data-label="Parameter Description">{p.description || ''}</td>
                <td data-label="Health Range of Parameter"><div className="range">{formatRanges(p.ranges)}</div></td>
                <td data-label="Current Test Value">
                  {p.type === 'computed' ? (
                    <span>{Number.isFinite(valNum) ? valNum : ''}</span>
                  ) : (
                    <input
                      type="number"
                      step="any"
                      value={values[p.id] ?? ''}
                      onChange={e => onChangeValue(p.id, e.target.value)}
                      placeholder="Enter value"
                    />
                  )}
                </td>
                <td data-label="Evaluation">
                  {evaln ? (
                    <span className={`badge ${severityClass(evaln.severity)}`}>{evaln.message || evaln.label}</span>
                  ) : <span className="hint">Enter a value</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
