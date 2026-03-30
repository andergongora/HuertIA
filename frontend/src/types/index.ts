export interface Garden {
  id: string
  name: string
  created_at: string
}

export interface Row {
  id: string
  garden_id: string
  position: number
  slot_count: number
}

export interface PlantType {
  id: string
  name: string
  variety: string | null
  days_to_harvest: number | null
  color: string | null
  created_at: string
}

export type PlantOrigin = 'seed' | 'seedling' | 'cutting'
export type PlantingStatus = 'active' | 'harvested' | 'lost'

export interface Planting {
  id: string
  garden_id: string
  row_id: string | null
  slot_position: number | null
  plant_type_id: string
  origin: PlantOrigin
  planted_at: string
  status: PlantingStatus
  days_to_harvest: number | null
  created_at: string
}

export type EventType = 'note' | 'photo' | 'harvest' | 'loss'

export interface PlantingEvent {
  id: string
  planting_id: string
  event_type: EventType
  raw_note: string | null
  ai_summary: string | null
  ai_tags: string[]
  ai_advice: string | null
  photo_path: string | null
  quantity: number | null
  unit: string | null
  created_at: string
}

export interface Expense {
  id: string
  garden_id: string
  category: string
  amount: number
  description: string
  date: string
}
