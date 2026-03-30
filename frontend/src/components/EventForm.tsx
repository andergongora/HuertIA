import { useState } from 'react'
import type { EventType, PlantingEvent } from '../types'
import { createEvent } from '../api/client'

interface Props {
  plantingId: string
  onCreated: (event: PlantingEvent) => void
}

export default function EventForm({ plantingId, onCreated }: Props) {
  const [type, setType] = useState<EventType>('note')
  const [note, setNote] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kg')
  const [saving, setSaving] = useState(false)
  const [advice, setAdvice] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setAdvice(null)
    try {
      const event = await createEvent(plantingId, {
        event_type: type,
        raw_note: note || null,
        quantity: quantity ? parseFloat(quantity) : null,
        unit: (type === 'harvest' || type === 'loss') ? unit : null,
      })
      if (event.ai_advice) setAdvice(event.ai_advice)
      setNote('')
      setQuantity('')
      onCreated(event)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="font-medium text-gray-800 text-sm">Añadir evento</h3>

      <div className="flex gap-2">
        {(['note', 'harvest', 'loss', 'photo'] as EventType[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              type === t
                ? 'bg-green-600 text-white border-green-600'
                : 'text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {{ note: 'Nota', harvest: 'Cosecha', loss: 'Pérdida', photo: 'Foto' }[t]}
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={type === 'note' ? 'Escribe tu observación...' : 'Nota opcional...'}
        rows={3}
        required={type === 'note'}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
      />

      {(type === 'harvest' || type === 'loss') && (
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            placeholder="Cantidad"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="kg">kg</option>
            <option value="uds">uds</option>
            <option value="g">g</option>
          </select>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Registrar'}
      </button>

      {advice && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <span className="font-medium">Consejo IA:</span> {advice}
        </div>
      )}
    </form>
  )
}
