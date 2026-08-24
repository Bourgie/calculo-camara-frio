import type { CamaraInput } from './calc'

export interface HistorialItem {
  id: string
  fecha: string
  cliente: string
  tel?: string
  vendedor?: string
  input: CamaraInput
  hp: number | null
}

const KEY = 'ccf_historial_v1'
const KEY_VENDEDOR = 'ccf_vendedor_v1'

export function getVendedor(): string {
  try { return localStorage.getItem(KEY_VENDEDOR) || '' } catch { return '' }
}
export function setVendedor(v: string) {
  try { localStorage.setItem(KEY_VENDEDOR, v) } catch {}
}

export function getHistorial(): HistorialItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function pushHistorial(item: HistorialItem) {
  const list = getHistorial()
  list.unshift(item)
  const trimmed = list.slice(0, 10)
  try { localStorage.setItem(KEY, JSON.stringify(trimmed)) } catch {}
}

export function clearHistorial() {
  try { localStorage.removeItem(KEY) } catch {}
}
