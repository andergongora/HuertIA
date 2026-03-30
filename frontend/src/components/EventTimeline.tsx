import type { PlantingEvent } from '../types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const EVENT_ICONS: Record<string, string> = {
  note: '📝',
  harvest: '🌾',
  loss: '💔',
  photo: '📷',
}

const EVENT_COLORS: Record<string, string> = {
  note: 'bg-blue-50 border-blue-200',
  harvest: 'bg-green-50 border-green-200',
  loss: 'bg-red-50 border-red-200',
  photo: 'bg-purple-50 border-purple-200',
}

interface Props {
  events: PlantingEvent[]
}

export default function EventTimeline({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">Sin eventos registrados aún.</p>
  }

  return (
    <div className="space-y-3">
      {[...events].reverse().map(event => (
        <div
          key={event.id}
          className={`border rounded-xl p-4 ${EVENT_COLORS[event.event_type] ?? 'bg-gray-50 border-gray-200'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{EVENT_ICONS[event.event_type]}</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {event.event_type}
              </span>
              {event.quantity != null && (
                <span className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 font-medium">
                  {event.quantity} {event.unit}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {new Date(event.created_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          {event.raw_note && (
            <p className="mt-2 text-sm text-gray-700">{event.raw_note}</p>
          )}

          {event.photo_path && (
            <img
              src={`${API_URL}/photos/${event.photo_path}`}
              alt="Foto del evento"
              className="mt-2 rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90"
              onClick={() => window.open(`${API_URL}/photos/${event.photo_path}`, '_blank')}
            />
          )}

          {(event.ai_summary || event.ai_advice) && (
            <div className="mt-3 bg-white/70 rounded-lg p-3 space-y-1">
              {event.ai_summary && (
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Resumen:</span> {event.ai_summary}
                </p>
              )}
              {event.ai_tags && event.ai_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {event.ai_tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {event.ai_advice && (
                <p className="text-xs text-yellow-800 mt-1">
                  <span className="font-semibold">Consejo:</span> {event.ai_advice}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
