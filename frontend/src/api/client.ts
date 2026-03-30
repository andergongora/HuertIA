import type { Garden, Row, PlantType, Planting, PlantingEvent, Expense } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json()
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`)
  return res.json()
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`)
}

// Gardens
export const getGardens = () => get<Garden[]>('/gardens')
export const getGarden = (id: string) => get<Garden>(`/gardens/${id}`)
export const createGarden = (name: string) => post<Garden>('/gardens', { name })

// Rows
export const getRows = (gardenId: string) => get<Row[]>(`/gardens/${gardenId}/rows`)
export const createRow = (gardenId: string, position: number) =>
  post<Row>(`/gardens/${gardenId}/rows`, { garden_id: gardenId, position, slot_count: 3 })
export const updateRow = (rowId: string, data: Partial<Row>) => patch<Row>(`/rows/${rowId}`, data)
export const deleteRow = (rowId: string) => del(`/rows/${rowId}`)

// Plant Types
export const getPlantTypes = () => get<PlantType[]>('/plant-types')
export const createPlantType = (data: Omit<PlantType, 'id' | 'created_at'>) =>
  post<PlantType>('/plant-types', data)

// Plantings
export const getPlantings = (gardenId?: string, status?: string) => {
  const params = new URLSearchParams()
  if (gardenId) params.set('garden_id', gardenId)
  if (status) params.set('status', status)
  const q = params.toString()
  return get<Planting[]>(`/plantings${q ? `?${q}` : ''}`)
}
export const getPlanting = (id: string) => get<Planting>(`/plantings/${id}`)
export const createPlanting = (data: Omit<Planting, 'id' | 'created_at'>) =>
  post<Planting>('/plantings', data)
export const updatePlanting = (id: string, data: Partial<Planting>) =>
  patch<Planting>(`/plantings/${id}`, data)
export const deletePlanting = (id: string) => del(`/plantings/${id}`)

// Events
export const getEvents = (plantingId: string) =>
  get<PlantingEvent[]>(`/plantings/${plantingId}/events`)
export const createEvent = (plantingId: string, data: Partial<PlantingEvent>) =>
  post<PlantingEvent>(`/plantings/${plantingId}/events`, {
    planting_id: plantingId,
    ...data,
  })

// Expenses
export const getExpenses = (gardenId?: string) => {
  const q = gardenId ? `?garden_id=${gardenId}` : ''
  return get<Expense[]>(`/expenses${q}`)
}
export const createExpense = (data: Omit<Expense, 'id'>) => post<Expense>('/expenses', data)
export const deleteExpense = (id: string) => del(`/expenses/${id}`)

// Chat
export const sendChatMessage = (message: string, gardenId?: string) =>
  post<{ reply: string }>('/chat', { message, garden_id: gardenId ?? null })

export async function streamChat(
  messages: { role: string; content: string }[],
  gardenId?: string
): Promise<Response> {
  return fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, garden_id: gardenId ?? null }),
  })
}
