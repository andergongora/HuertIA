import type { Planting, PlantType } from '../types'

export function hexToSlotStyle(hex: string): { bg: string; border: string; text: string } {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const tint = (c: number) => Math.round(c * 0.25 + 255 * 0.75)
  const darken = (c: number) => Math.round(c * 0.35)
  return {
    bg: `rgb(${tint(r)}, ${tint(g)}, ${tint(b)})`,
    border: hex,
    text: `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`,
  }
}

// Paleta: color de fondo suave + borde más saturado
const PALETTE = [
  { bg: '#bbf7d0', border: '#22c55e', text: '#14532d' },
  { bg: '#fecaca', border: '#ef4444', text: '#7f1d1d' },
  { bg: '#fde68a', border: '#f59e0b', text: '#78350f' },
  { bg: '#fed7aa', border: '#f97316', text: '#7c2d12' },
  { bg: '#ddd6fe', border: '#8b5cf6', text: '#3b0764' },
  { bg: '#fbcfe8', border: '#ec4899', text: '#831843' },
  { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a5f' },
  { bg: '#99f6e4', border: '#14b8a6', text: '#134e4a' },
  { bg: '#d9f99d', border: '#84cc16', text: '#365314' },
  { bg: '#fef08a', border: '#eab308', text: '#713f12' },
]

function paletteFor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
  return PALETTE[hash % PALETTE.length]
}

function plantEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('tomate')) return '🍅'
  if (n.includes('fresa') || n.includes('fresón')) return '🍓'
  if (n.includes('lechuga') || n.includes('acelga') || n.includes('espinaca')) return '🥬'
  if (n.includes('pimiento')) return '🫑'
  if (n.includes('pepino') || n.includes('calabacín') || n.includes('calabacin')) return '🥒'
  if (n.includes('zanahoria')) return '🥕'
  if (n.includes('cebolla')) return '🧅'
  if (n.includes('ajo')) return '🧄'
  if (n.includes('berenjena')) return '🍆'
  if (n.includes('maíz') || n.includes('maiz')) return '🌽'
  if (n.includes('brócoli') || n.includes('coliflor')) return '🥦'
  if (n.includes('sandía') || n.includes('sandia')) return '🍉'
  if (n.includes('melón') || n.includes('melon')) return '🍈'
  if (n.includes('calabaza')) return '🎃'
  if (n.includes('judía') || n.includes('guisante') || n.includes('alubia')) return '🫘'
  if (n.includes('albahaca') || n.includes('menta') || n.includes('perejil') || n.includes('hierba')) return '🌿'
  return '🌱'
}

interface Props {
  rowId: string
  position: number
  planting?: Planting
  plantType?: PlantType
  onClick: () => void
}

export default function SlotCell({ position, planting, plantType, onClick }: Props) {
  if (!planting) {
    return (
      <button
        onClick={onClick}
        title={`Hueco ${position} — vacío`}
        className="w-full h-20 rounded-xl border-2 border-dashed border-gray-200 bg-white hover:bg-green-50 hover:border-green-300 transition-all flex flex-col items-center justify-center gap-1 group"
      >
        <span className="text-lg text-gray-200 group-hover:text-green-400 transition-colors">+</span>
        <span className="text-[9px] text-gray-300 group-hover:text-green-400">Plantar</span>
      </button>
    )
  }

  const { bg, border, text } = plantType?.color
    ? hexToSlotStyle(plantType.color)
    : paletteFor(planting.plant_type_id)
  const name = plantType?.name ?? '?'
  const variety = plantType?.variety
  const emoji = plantEmoji(name)
  const isInactive = planting.status !== 'active'

  // Calcular días hasta cosecha (el planting puede sobreescribir el tipo)
  let daysLeft: number | null = null
  const effectiveDays = planting.days_to_harvest ?? plantType?.days_to_harvest
  if (effectiveDays && planting.status === 'active') {
    const harvestDate = new Date(planting.planted_at)
    harvestDate.setDate(harvestDate.getDate() + effectiveDays)
    daysLeft = Math.ceil((harvestDate.getTime() - Date.now()) / 86_400_000)
  }

  const isReady = daysLeft !== null && daysLeft <= 0
  const isSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7

  const harvestLabel = isReady
    ? '¡Lista!'
    : daysLeft !== null
      ? `${daysLeft}d`
      : null

  const tooltipText = [
    `${name}${variety ? ` (${variety})` : ''}`,
    planting.status,
    harvestLabel ? `cosecha: ${harvestLabel}` : '',
  ].filter(Boolean).join(' · ')

  return (
    <button
      onClick={onClick}
      title={tooltipText}
      style={{
        backgroundColor: bg,
        borderColor: isReady ? '#16a34a' : isSoon ? '#d97706' : border,
        color: text,
        boxShadow: isReady ? '0 0 0 2px #bbf7d0, 0 0 0 4px #16a34a' : undefined,
      }}
      className="w-full h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden"
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <span className="text-[10px] font-semibold leading-tight text-center px-1 max-w-full truncate">
        {name}
      </span>
      {variety && (
        <span className="text-[8px] opacity-70 leading-none truncate max-w-full px-1">
          {variety}
        </span>
      )}

      {/* Indicador de cosecha — solo en activos */}
      {harvestLabel && !isInactive && (
        <span
          className={`absolute bottom-0 inset-x-0 text-center text-[9px] font-bold py-0.5 leading-none ${
            isReady
              ? 'bg-green-500 text-white animate-pulse'
              : isSoon
                ? 'bg-amber-400 text-amber-900'
                : 'bg-black/10 text-current'
          }`}
        >
          {isReady ? '🌾 ¡Lista!' : `${daysLeft}d`}
        </span>
      )}

      {isInactive && (
        <span className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
          <span className="text-xl">
            {planting.status === 'harvested' ? '✅' : '❌'}
          </span>
        </span>
      )}
    </button>
  )
}
