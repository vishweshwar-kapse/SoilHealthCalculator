import React, { useMemo, useState, useEffect } from 'react'
import { loadPresets, savePresets } from '../lib/presets'

function emptyParam() {
  return { id: '', name: '', description: '', unit: '', type: 'input', expression: '', ranges: [] }
}

function toNumberOrUndef(v) {
  if (v === '' || v === null || v === undefined) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

export default function MasterDataEditor({ master, onChangeMaster, onResetDefaults }) {
  const [selectedId, setSelectedId] = useState(master?.parameters?.[0]?.id || '')
  const [draftNew, setDraftNew] = useState(emptyParam())
  // Presets library persisted in localStorage (by parameter id)
  const [presetsLib, setPresetsLib] = useState(() => loadPresets())
  const [draftNewPresetId, setDraftNewPresetId] = useState('')
  const [savePresetName, setSavePresetName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')

  const params = master?.parameters || []
  const selected = useMemo(() => params.find(p => p.id === selectedId) || null, [params, selectedId])

  function updateParam(id, patch) {
    const next = params.map(p => (p.id === id ? { ...p, ...patch } : p))
    onChangeMaster({ ...master, parameters: next })
  }

  function addRangeRow(id) {
    const p = params.find(x => x.id === id)
    if (!p) return
    const tpl = p.type === 'select'
      ? { value: '', label: '', message: '' }
      : { label: '', min: undefined, max: undefined, message: '' }
    const nextRanges = [...(p.ranges || []), tpl]
    updateParam(id, { ranges: nextRanges })
  }

  function updateRange(id, idx, field, value) {
    const p = params.find(x => x.id === id)
    if (!p) return
    const nextRanges = (p.ranges || []).map((r, i) => i === idx ? {
      ...r,
      [field]: field === 'min' || field === 'max' ? toNumberOrUndef(value) : value
    } : r)
    updateParam(id, { ranges: nextRanges })
  }

  function removeRange(id, idx) {
    const p = params.find(x => x.id === id)
    if (!p) return
    const nextRanges = (p.ranges || []).filter((_, i) => i !== idx)
    updateParam(id, { ranges: nextRanges })
  }

  function deleteParam(id) {
    if (!id) return
    if (!window.confirm('Delete this parameter? This cannot be undone.')) return
    const next = params.filter(p => p.id !== id)
    onChangeMaster({ ...master, parameters: next })
    setSelectedId(next[0]?.id || '')
  }

  function addNewParam() {
    const base = { ...draftNew }
    const id = (base.id || base.name || '').trim().replace(/\s+/g, '_').toLowerCase()
    if (!id) return alert('Please provide an id or name for the new parameter')
    if (params.some(p => p.id === id)) return alert('A parameter with this id already exists')
    let ranges = base.ranges || []
    // If creating a select param and a saved preset is chosen for this id, apply it
    if (base.type === 'select' && (!ranges || ranges.length === 0) && draftNewPresetId) {
      const existing = (presetsLib.byParamId?.[id] || []).find(p => p.id === draftNewPresetId)
      if (existing) ranges = (existing.ranges || []).map(r => ({ ...r }))
    }
    const clean = { ...base, id, ranges }
    const next = [...params, clean]
    onChangeMaster({ ...master, parameters: next })
    setDraftNew(emptyParam())
    setDraftNewPresetId('')
    setSelectedId(id)
  }

  // Persist presets library when it changes
  useEffect(() => { savePresets(presetsLib) }, [presetsLib])

  function presetsForParamId(paramId) {
    const id = (paramId || '').trim().toLowerCase()
    return presetsLib?.byParamId?.[id] || []
  }

  function saveCurrentOptionsAsPreset(paramId) {
    const id = (paramId || '').trim().toLowerCase()
    if (!id) return alert('Parameter id is required to save presets')
    if (!savePresetName.trim()) return alert('Please provide a name for the preset')
    const p = params.find(x => x.id === id)
    if (!p || p.type !== 'select') return alert('Only select-type parameters can save presets')
    const ranges = (p.ranges || []).map(r => ({ value: r.value || '', label: r.label || '', message: r.message || '', severity: r.severity }))
    const entry = { id: `pz_${Date.now()}_${Math.floor(Math.random()*1e6)}`, name: savePresetName.trim(), ranges }
    setPresetsLib(prev => {
      const next = { byParamId: { ...(prev.byParamId || {}) } }
      const arr = [...(next.byParamId[id] || []), entry]
      next.byParamId[id] = arr
      return next
    })
    setSavePresetName('')
  }

  function applyPresetToSelected(paramId) {
    if (!paramId || !selectedPresetId) return
    const list = presetsForParamId(paramId)
    const found = list.find(p => p.id === selectedPresetId)
    if (!found) return
    const cloned = (found.ranges || []).map(r => ({ ...r }))
    updateParam(paramId, { ranges: cloned })
  }

  function deletePreset(paramId) {
    if (!paramId || !selectedPresetId) return
    if (!window.confirm('Delete this preset?')) return
    const id = (paramId || '').trim().toLowerCase()
    setPresetsLib(prev => {
      const next = { byParamId: { ...(prev.byParamId || {}) } }
      const arr = (next.byParamId[id] || []).filter(p => p.id !== selectedPresetId)
      next.byParamId[id] = arr
      return next
    })
    setSelectedPresetId('')
  }

  function insertDraftPresetOptions() {
    const id = (draftNew.id || '').trim().toLowerCase()
    if (!id || !draftNewPresetId) return
    const list = presetsForParamId(id)
    const found = list.find(p => p.id === draftNewPresetId)
    if (!found) return
    setDraftNew(d => ({ ...d, ranges: (found.ranges || []).map(r => ({ ...r })) }))
  }

  return (
    <div className="panel">
      <div className="editor-header">
        <h3>Master Data</h3>
        <div className="spacer" />
        <button className="danger" onClick={onResetDefaults}>Reset to Defaults</button>
        <span className="hint">Changes are saved to your browser</span>
      </div>

      <div className="md-grid">
        <div className="md-list">
          <div className="md-list-header">Parameters ({params.length})</div>
          <ul>
            {params.map(p => (
              <li key={p.id} className={p.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(p.id)}>
                <div className="title">{p.name || p.id}{p.unit ? ` (${p.unit})` : ''}</div>
                <div className="meta">{p.id} • {p.type}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="md-editor">
          {selected ? (
            <div className="form">
              <div className="row">
                <label>Id</label>
                <input value={selected.id} onChange={e => updateParam(selected.id, { id: e.target.value })} />
              </div>
              <div className="row">
                <label>Name</label>
                <input value={selected.name || ''} onChange={e => updateParam(selected.id, { name: e.target.value })} />
              </div>
              <div className="row">
                <label>Description</label>
                <input value={selected.description || ''} onChange={e => updateParam(selected.id, { description: e.target.value })} />
              </div>
              <div className="row two">
                <div>
                  <label>Unit</label>
                  <input value={selected.unit || ''} onChange={e => updateParam(selected.id, { unit: e.target.value })} />
                </div>
                <div>
                  <label>Type</label>
                  <select value={selected.type || 'input'} onChange={e => updateParam(selected.id, { type: e.target.value })}>
                    <option value="input">input</option>
                    <option value="computed">computed</option>
                    <option value="select">select</option>
                  </select>
                </div>
              </div>
              {selected.type === 'computed' && (
                <div className="row">
                  <label>Expression</label>
                  <input value={selected.expression || ''} onChange={e => updateParam(selected.id, { expression: e.target.value })} placeholder="e.g., ca + mg + k + na" />
                </div>
              )}

              {selected.type === 'select' ? (
                <div className="row">
                  <label>Options</label>
                  <div className="ranges">
                    {(selected.ranges || []).map((r, idx) => (
                      <div key={idx} className="range-row">
                        <input className="sm" placeholder="Value (e.g., Brown)" value={r.value || ''} onChange={e => updateRange(selected.id, idx, 'value', e.target.value)} />
                        <input className="sm" placeholder="Label (e.g., Normal)" value={r.label || ''} onChange={e => updateRange(selected.id, idx, 'label', e.target.value)} />
                        <input className="lg" placeholder="Message" value={r.message || ''} onChange={e => updateRange(selected.id, idx, 'message', e.target.value)} />
                        <button className="danger" onClick={() => removeRange(selected.id, idx)}>Remove</button>
                      </div>
                    ))}
                    <button onClick={() => addRangeRow(selected.id)}>Add Option</button>
                  </div>
                </div>
              ) : (
                <div className="row">
                  <label>Ranges</label>
                  <div className="ranges">
                    {(selected.ranges || []).map((r, idx) => (
                      <div key={idx} className="range-row">
                        <input className="sm" placeholder="Label" value={r.label || ''} onChange={e => updateRange(selected.id, idx, 'label', e.target.value)} />
                        <input className="sm" placeholder="Min" type="number" step="any" value={r.min ?? ''} onChange={e => updateRange(selected.id, idx, 'min', e.target.value)} />
                        <input className="sm" placeholder="Max" type="number" step="any" value={r.max ?? ''} onChange={e => updateRange(selected.id, idx, 'max', e.target.value)} />
                        <input className="lg" placeholder="Message" value={r.message || ''} onChange={e => updateRange(selected.id, idx, 'message', e.target.value)} />
                        <button className="danger" onClick={() => removeRange(selected.id, idx)}>Remove</button>
                      </div>
                    ))}
                    <button onClick={() => addRangeRow(selected.id)}>Add Range</button>
                  </div>
                </div>
              )}

              {selected.type === 'select' && (
                <div className="row two">
                  <div>
                    <label>Save as preset for “{selected.id}”</label>
                    <input placeholder="Preset name" value={savePresetName} onChange={e => setSavePresetName(e.target.value)} />
                    <button onClick={() => saveCurrentOptionsAsPreset(selected.id)} disabled={!savePresetName.trim()}>Save Preset</button>
                  </div>
                  <div>
                    <label>Load saved preset</label>
                    <select value={selectedPresetId} onChange={e => setSelectedPresetId(e.target.value)}>
                      <option value="">Choose saved preset…</option>
                      {presetsForParamId(selected.id).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button onClick={() => applyPresetToSelected(selected.id)} disabled={!selectedPresetId}>Apply to Options</button>
                    <button className="danger" onClick={() => deletePreset(selected.id)} disabled={!selectedPresetId}>Delete Preset</button>
                  </div>
                </div>
              )}

              <div className="row">
                <button className="danger" onClick={() => deleteParam(selected.id)}>Delete Parameter</button>
              </div>
            </div>
          ) : (
            <div className="muted">Select a parameter to edit</div>
          )}

          <hr />

          <div className="form">
            <h4>Add New Parameter</h4>
            <div className="row two">
              <div>
                <label>Id</label>
                <input value={draftNew.id} onChange={e => setDraftNew(d => ({ ...d, id: e.target.value }))} />
              </div>
              <div>
                <label>Name</label>
                <input value={draftNew.name} onChange={e => setDraftNew(d => ({ ...d, name: e.target.value }))} />
              </div>
            </div>
              <div className="row two">
                <div>
                  <label>Type</label>
                  <select value={draftNew.type} onChange={e => setDraftNew(d => ({ ...d, type: e.target.value }))}>
                    <option value="input">input</option>
                    <option value="computed">computed</option>
                    <option value="select">select</option>
                  </select>
                </div>
                <div>
                  <label>Unit</label>
                  <input value={draftNew.unit} onChange={e => setDraftNew(d => ({ ...d, unit: e.target.value }))} />
                </div>
              </div>
            {draftNew.type === 'select' && (
              <div className="row two">
                <div>
                  <label>Saved presets for “{(draftNew.id||'').trim()||'id'}”</label>
                  <select value={draftNewPresetId} onChange={e => setDraftNewPresetId(e.target.value)}>
                    <option value="">Choose saved preset…</option>
                    {presetsForParamId(draftNew.id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>&nbsp;</label>
                  <button onClick={insertDraftPresetOptions} disabled={!draftNewPresetId}>Insert Preset Options</button>
                </div>
              </div>
            )}
            {draftNew.type === 'computed' && (
              <div className="row">
                <label>Expression</label>
                <input value={draftNew.expression} onChange={e => setDraftNew(d => ({ ...d, expression: e.target.value }))} placeholder="e.g., ca + mg + k + na" />
              </div>
            )}
            <div className="row">
              <label>Description</label>
              <input value={draftNew.description} onChange={e => setDraftNew(d => ({ ...d, description: e.target.value }))} />
            </div>
            <div className="row">
              <button onClick={addNewParam}>Add Parameter</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
