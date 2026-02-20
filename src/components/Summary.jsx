import React from 'react'

function severityClass(s) {
  return s === 0 ? 'ok' : s === 1 ? 'warn' : 'bad'
}

export default function Summary({ evaluations }) {
  const items = Object.values(evaluations || {}).filter(Boolean)
  const counts = items.reduce((acc, e) => { acc[e.severity] = (acc[e.severity]||0)+1; return acc }, {})
  const score = items.reduce((acc, e) => acc + (e.severity||0), 0)
  const avg = items.length ? (score / items.length) : 0
  const overall = avg < 0.5 ? { t: 'Overall Healthy', s: 0 } : avg < 1.5 ? { t: 'Needs Attention', s: 1 } : { t: 'Poor', s: 2 }

  return (
    <div className="panel">
      <h3>Summary</h3>
      <div className="summary">
        <span className={`badge ${severityClass(overall.s)}`}>{overall.t}</span>
        <span className="pill">Good: {counts[0]||0}</span>
        <span className="pill">Moderate: {counts[1]||0}</span>
        <span className="pill">Poor: {counts[2]||0}</span>
        <span className="pill">Parameters: {items.length}</span>
      </div>
    </div>
  )
}
