import React from 'react'
import { formatRanges, evaluateValueAgainstRanges } from '../lib/evaluator.js'

function severityClass(s) { return s === 0 ? 'ok' : s === 1 ? 'warn' : 'bad' }

export default function ParameterTable({ parameters, values, computed, onChangeValue }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{minWidth:220}}>Soil Health Parameter</th>
            <th style={{minWidth:260}}>Parameter Description</th>
            <th style={{minWidth:200}}>Health Range of Parameter</th>
            <th style={{minWidth:160}}>Current Test Value</th>
            <th style={{minWidth:220}}>Evaluation</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map(p => {
            const v = p.type === 'computed' ? computed[p.id] : (values[p.id] ?? '')
            const valNum = p.type === 'computed' ? v : (v === '' ? NaN : Number(v))
            const evaln = evaluateValueAgainstRanges(valNum, p.ranges)
            return (
              <tr key={p.id}>
                <td><strong>{p.name || p.id}</strong>{p.unit ? ` (${p.unit})` : ''}{p.type === 'computed' ? ' • computed' : ''}</td>
                <td>{p.description || ''}</td>
                <td><div className="range">{formatRanges(p.ranges)}</div></td>
                <td>
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
                <td>
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
