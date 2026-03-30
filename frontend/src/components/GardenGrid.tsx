import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Garden, Row, Planting, PlantType } from '../types'
import { createRow, updateRow } from '../api/client'
import RowEditor from './RowEditor'
import CropModal from './CropModal'
import { hexToSlotStyle } from './SlotCell'

interface Props {
    garden: Garden
    rows: Row[]
    plantings: Planting[]
    plantTypes: PlantType[]
    onRefresh: () => void
}

// Misma paleta que SlotCell para la leyenda
const PALETTE_BG = [
    '#bbf7d0', '#fecaca', '#fde68a', '#fed7aa', '#ddd6fe',
    '#fbcfe8', '#bfdbfe', '#99f6e4', '#d9f99d', '#fef08a',
]
const PALETTE_BORDER = [
    '#22c55e', '#ef4444', '#f59e0b', '#f97316', '#8b5cf6',
    '#ec4899', '#3b82f6', '#14b8a6', '#84cc16', '#eab308',
]

function paletteIndexFor(id: string): number {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
    return hash % PALETTE_BG.length
}

export default function GardenGrid({ garden, rows, plantings, plantTypes, onRefresh }: Props) {
    const navigate = useNavigate()
    const [modal, setModal] = useState<{ rowId: string; position: number } | null>(null)

    async function addRow() {
        const nextPos = rows.length > 0 ? Math.max(...rows.map(r => r.position)) + 1 : 1
        await createRow(garden.id, nextPos)
        onRefresh()
    }

    async function moveRow(rowId: string, dir: 'up' | 'down') {
        const idx = sortedRows.findIndex(r => r.id === rowId)
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= sortedRows.length) return
        const a = sortedRows[idx]
        const b = sortedRows[swapIdx]
        if (!confirm(`¿Mover fila ${a.position} ${dir === 'up' ? 'arriba' : 'abajo'}?`)) return
        await Promise.all([
            updateRow(a.id, { position: b.position }),
            updateRow(b.id, { position: a.position }),
        ])
        onRefresh()
    }

    function handleSlotClick(rowId: string, position: number, planting?: Planting) {
        if (planting) {
            navigate(`/plantings/${planting.id}`)
        } else {
            setModal({ rowId, position })
        }
    }

    const sortedRows = [...rows].sort((a, b) => a.position - b.position)

    // Leyenda: tipos de planta únicos presentes
    const usedTypeIds = [...new Set(plantings.map(p => p.plant_type_id))]
    const legendItems = usedTypeIds
        .map(id => plantTypes.find(pt => pt.id === id))
        .filter((pt): pt is PlantType => pt !== undefined)

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full">
            {/* Cabecera del grid */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-gray-800">{garden.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {rows.length} {rows.length === 1 ? 'fila' : 'filas'} · {plantings.filter(p => p.status === 'active').length} cultivos activos
                    </p>
                </div>
                <button
                    onClick={addRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                    + Añadir fila
                </button>
            </div>

            {/* Filas */}
            <div className="px-6 py-2">
                {sortedRows.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-4xl mb-3">🌱</p>
                        <p className="text-gray-400 text-sm">Añade tu primera fila para empezar a plantar.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {sortedRows.map((row, idx) => (
                            <RowEditor
                                key={row.id}
                                row={row}
                                plantings={plantings}
                                plantTypes={plantTypes}
                                onSlotClick={handleSlotClick}
                                onRowChange={onRefresh}
                                canMoveUp={idx > 0}
                                canMoveDown={idx < sortedRows.length - 1}
                                onMoveUp={() => moveRow(row.id, 'up')}
                                onMoveDown={() => moveRow(row.id, 'down')}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Leyenda */}
            {legendItems.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/50 flex flex-wrap gap-2">
                    {legendItems.map(pt => {
                        const colors = pt.color
                            ? hexToSlotStyle(pt.color)
                            : { bg: PALETTE_BG[paletteIndexFor(pt.id)], border: PALETTE_BORDER[paletteIndexFor(pt.id)] }
                        return (
                            <span
                                key={pt.id}
                                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border"
                            >
                                <span
                                    style={{ backgroundColor: colors.border }}
                                    className="w-2 h-2 rounded-full shrink-0"
                                />
                                {pt.name}{pt.variety ? ` (${pt.variety})` : ''}
                            </span>
                        )
                    })}
                </div>
            )}

            {modal && (
                <CropModal
                    gardenId={garden.id}
                    rowId={modal.rowId}
                    slotPosition={modal.position}
                    plantTypes={plantTypes}
                    onClose={() => setModal(null)}
                    onCreated={() => { setModal(null); onRefresh() }}
                />
            )}
        </div>
    )
}
