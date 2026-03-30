import { useState, useEffect } from 'react'
import type { PlantType, PlantOrigin } from '../types'
import { createPlanting, createPlantType } from '../api/client'

interface Props {
  gardenId: string
  rowId: string
  slotPosition: number
  plantTypes: PlantType[]
  onClose: () => void
  onCreated: () => void
}

const PRESET_COLORS = [
  { label: 'Rojo',     hex: '#e53e3e' },
  { label: 'Naranja',  hex: '#f97316' },
  { label: 'Amarillo', hex: '#eab308' },
  { label: 'Verde',    hex: '#22c55e' },
  { label: 'Turquesa', hex: '#14b8a6' },
  { label: 'Azul',     hex: '#3b82f6' },
  { label: 'Morado',   hex: '#8b5cf6' },
  { label: 'Rosa',     hex: '#ec4899' },
  { label: 'Marrón',   hex: '#92400e' },
  { label: 'Gris',     hex: '#6b7280' },
]

export default function CropModal({ gardenId, rowId, slotPosition, plantTypes, onClose, onCreated }: Props) {
  const [plantTypeId, setPlantTypeId] = useState('')
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeVariety, setNewTypeVariety] = useState('')
  const [newTypeDays, setNewTypeDays] = useState('')
  const [newTypeColor, setNewTypeColor] = useState<string>('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [isNewType, setIsNewType] = useState(false)
  const [origin, setOrigin] = useState<PlantOrigin>('seedling')
  const [plantedAt, setPlantedAt] = useState(new Date().toISOString().split('T')[0])
  const [plantingDays, setPlantingDays] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!plantTypeId) { setPlantingDays(''); return }
    const pt = plantTypes.find(p => p.id === plantTypeId)
    setPlantingDays(pt?.days_to_harvest != null ? String(pt.days_to_harvest) : '')
  }, [plantTypeId, plantTypes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let finalTypeId = plantTypeId

      if (isNewType) {
        const pt = await createPlantType({
          name: newTypeName,
          variety: newTypeVariety || null,
          days_to_harvest: newTypeDays ? parseInt(newTypeDays) : null,
          color: newTypeColor || null,
        })
        finalTypeId = pt.id
      }

      await createPlanting({
        garden_id: gardenId,
        row_id: rowId,
        slot_position: slotPosition,
        plant_type_id: finalTypeId,
        origin,
        planted_at: plantedAt,
        status: 'active',
        days_to_harvest: plantingDays ? parseInt(plantingDays) : null,
      })
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  const selectedTypeDays = plantTypes.find(p => p.id === plantTypeId)?.days_to_harvest

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-gray-800">Asignar cultivo — Hueco {slotPosition}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo de planta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de planta</label>
            {!isNewType ? (
              <div className="flex gap-2">
                <select
                  value={plantTypeId}
                  onChange={e => setPlantTypeId(e.target.value)}
                  required={!isNewType}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Selecciona...</option>
                  {plantTypes.map(pt => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}{pt.variety ? ` (${pt.variety})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsNewType(true)}
                  className="text-sm text-green-700 hover:underline whitespace-nowrap"
                >
                  + Nuevo
                </button>
              </div>
            ) : (
              <div className="space-y-2 border border-green-200 rounded-lg p-3 bg-green-50">
                <input
                  placeholder="Nombre (ej. tomate)"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  placeholder="Variedad (opcional)"
                  value={newTypeVariety}
                  onChange={e => setNewTypeVariety(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Días hasta cosecha (opcional)"
                  value={newTypeDays}
                  onChange={e => setNewTypeDays(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />

                {/* Selector de color */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Color</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setNewTypeColor(c.hex)}
                        className={`text-sm font-semibold px-2 py-0.5 rounded-md border-2 transition-all ${
                          newTypeColor === c.hex
                            ? 'border-gray-600 bg-white scale-110'
                            : 'border-transparent hover:border-gray-300 bg-transparent'
                        }`}
                        style={{ color: c.hex }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setAdvancedOpen(o => !o)}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <span>{advancedOpen ? '▾' : '▸'}</span> Avanzado
                  </button>
                  {advancedOpen && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="color"
                        value={newTypeColor || '#22c55e'}
                        onChange={e => setNewTypeColor(e.target.value.toLowerCase())}
                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                      />
                      <span className="text-xs text-gray-400 font-mono">{newTypeColor || '—'}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewType(false)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Usar tipo existente
                </button>
              </div>
            )}
          </div>

          {/* Origen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
            <select
              value={origin}
              onChange={e => setOrigin(e.target.value as PlantOrigin)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="seedling">Trasplante (plantel)</option>
              <option value="seed">Semilla</option>
              <option value="cutting">Esqueje</option>
            </select>
          </div>

          {/* Fecha de siembra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de plantación</label>
            <input
              type="date"
              value={plantedAt}
              onChange={e => setPlantedAt(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Días hasta cosecha (override por planting) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Días hasta cosecha{' '}
              <span className="text-gray-400 font-normal text-xs">(opcional)</span>
            </label>
            <input
              type="number"
              placeholder={
                selectedTypeDays != null
                  ? `${selectedTypeDays} (del tipo de planta)`
                  : 'Personalizar...'
              }
              value={plantingDays}
              onChange={e => setPlantingDays(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Guardando...' : 'Plantar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
