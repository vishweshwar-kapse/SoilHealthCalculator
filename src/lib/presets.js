// Simple localStorage-backed presets library
// Structure: { byParamId: { [id: string]: Array<{ id: string, name: string, ranges: any[] }> } }

const KEY = 'presetsV1'

export function loadPresets() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { byParamId: {} }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { byParamId: {} }
    if (!parsed.byParamId || typeof parsed.byParamId !== 'object') return { byParamId: {} }
    return parsed
  } catch {
    return { byParamId: {} }
  }
}

export function savePresets(presets) {
  try {
    const safe = presets && typeof presets === 'object' ? presets : { byParamId: {} }
    localStorage.setItem(KEY, JSON.stringify(safe))
  } catch {
    // ignore
  }
}
