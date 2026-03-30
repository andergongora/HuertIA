import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import type { Planting, PlantType, PlantingEvent } from '../types'
import { getPlanting, getPlantTypes, getEvents, updatePlanting, deletePlanting } from '../api/client'
import EventForm from '../components/EventForm'
import EventTimeline from '../components/EventTimeline'

const ORIGIN_LABELS = { seed: 'Semilla', seedling: 'Trasplante', cutting: 'Esqueje' }
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  harvested: 'bg-blue-100 text-blue-700',
  lost: 'bg-red-100 text-red-700',
}

export default function CropDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [planting, setPlanting] = useState<Planting | null>(null)
  const [plantType, setPlantType] = useState<PlantType | null>(null)
  const [events, setEvents] = useState<PlantingEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) load(id)
  }, [id])

  async function load(plantingId: string) {
    setLoading(true)
    const [p, pts, evs] = await Promise.all([
      getPlanting(plantingId),
      getPlantTypes(),
      getEvents(plantingId),
    ])
    setPlanting(p)
    setPlantType(pts.find((pt: PlantType) => pt.id === p.plant_type_id) ?? null)
    setEvents(evs)
    setLoading(false)
  }

  async function changeStatus(status: Planting['status']) {
    if (!planting) return
    const updated = await updatePlanting(planting.id, { status })
    setPlanting(updated)
  }

  async function handleDelete() {
    if (!planting) return
    if (!confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return
    await deletePlanting(planting.id)
    navigate(`/gardens/${planting.garden_id}`, { replace: true })
  }

  if (loading || !planting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        {loading ? 'Cargando...' : 'Cultivo no encontrado.'}
      </div>
    )
  }

  const label = plantType
    ? `${plantType.name}${plantType.variety ? ` (${plantType.variety})` : ''}`
    : 'Cultivo'

  const daysToHarvest = planting.days_to_harvest ?? plantType?.days_to_harvest
  const harvestDate = daysToHarvest
    ? new Date(new Date(planting.planted_at).getTime() + daysToHarvest * 86400000)
    : null
  const daysLeft = harvestDate
    ? Math.ceil((harvestDate.getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to={`/gardens/${planting.garden_id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← Parcela
        </Link>
        <h1 className="text-lg font-bold text-gray-800">{label}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[planting.status]}`}>
          {planting.status}
        </span>
        <div className="ml-auto">
          <button
            onClick={handleDelete}
            className="text-sm text-red-400 hover:text-red-600 font-medium"
          >
            Eliminar planta
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Info card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Plantado como</p>
            <p className="font-medium">{ORIGIN_LABELS[planting.origin]}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Fecha de plantación</p>
            <p className="font-medium">{new Date(planting.planted_at).toLocaleDateString('es-ES')}</p>
          </div>
          {harvestDate && (
            <div>
              <p className="text-xs text-gray-400">Cosecha estimada</p>
              <p className="font-medium">
                {harvestDate.toLocaleDateString('es-ES')}
                {daysLeft != null && (
                  <span className={`ml-2 text-xs ${daysLeft <= 0 ? 'text-green-600 font-bold' : 'text-amber-600'}`}>
                    {daysLeft <= 0 ? '¡Lista!' : `${daysLeft}d`}
                  </span>
                )}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 mb-1">Estado</p>
            <div className="flex gap-1">
              {(['active', 'harvested', 'lost'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    planting.status === s
                      ? STATUS_COLORS[s] + ' border-transparent'
                      : 'border-gray-200 text-gray-400 hover:border-gray-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Event form */}
        <EventForm
          plantingId={planting.id}
          onCreated={ev => setEvents(prev => [...prev, ev])}
        />

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-medium text-gray-800 text-sm mb-4">Historial</h3>
          <EventTimeline events={events} />
        </div>
      </div>
    </div>
  )
}
