// Helpers for File System Access API with graceful fallback

export const hasFSAccess = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window

export async function pickDataDirectory() {
  if (!hasFSAccess()) throw new Error('File System Access API not supported in this browser')
  const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
  return dirHandle
}

export async function readJsonFromDir(dirHandle, filename) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: false }).catch(() => null)
  if (!fileHandle) return null
  const file = await fileHandle.getFile()
  const text = await file.text()
  return JSON.parse(text)
}

export async function writeJsonToDir(dirHandle, filename, data) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  await writable.close()
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}
