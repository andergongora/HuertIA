import { useState } from 'react'
import type { Row, Planting, PlantType } from '../types'
import { updateRow, deleteRow } from '../api/client'
import SlotCell from './SlotCell'

interface Props {
    row: Row
    plantings: Planting[]
    plantTypes: PlantType[]
    onSlotClick: (rowId: string, position: number, planting?: Planting) => void
    onRowChange: () => void
    canMoveUp: boolean
    canMoveDown: boolean
    onMoveUp: () => void
    onMoveDown: () => void
}

export default function RowEditor({ row, plantings, plantTypes, onSlotClick, onRowChange, canMoveUp, canMoveDown, onMoveUp, onMoveDown }: Props) {
    const [loading, setLoading] = useState(false)

    const plantingAt = (pos: number) => plantings.find(p => p.row_id === row.id && p.slot_position === pos)
    const ptMap = Object.fromEntries(plantTypes.map(pt => [pt.id, pt]))

    async function changeSlots(delta: number) {
        const newCount = row.slot_count + delta
        if (newCount < 1) return
        if (delta < 0) {
            const last = plantingAt(row.slot_count)
            if (last && !confirm(`El hueco ${row.slot_count} tiene un cultivo. ¿Eliminar el hueco?`)) return
        }
        setLoading(true)
        try {
            await updateRow(row.id, { slot_count: newCount })
            onRowChange()
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete() {
        if (!confirm(`¿Eliminar fila ${row.position}? Se perderán todos sus cultivos.`)) return
        setLoading(true)
        try {
            await deleteRow(row.id)
            onRowChange()
        } finally {
            setLoading(false)
        }
    }

    const occupied = Array.from({ length: row.slot_count }, (_, i) => i + 1)
        .filter(pos => plantingAt(pos)).length

    return (
        <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:gap-4 w-full">
            {/* Flechas de orden */}
            <div className="flex flex-col gap-0.5 shrink-0">
                <button
                    onClick={onMoveUp}
                    disabled={loading || !canMoveUp}
                    title="Mover arriba"
                    className="w-4 h-4 flex items-center justify-center text-[9px] text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:cursor-not-allowed transition-colors"
                >
                    ▲
                </button>
                <button
                    onClick={onMoveDown}
                    disabled={loading || !canMoveDown}
                    title="Mover abajo"
                    className="w-4 h-4 flex items-center justify-center text-[9px] text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:cursor-not-allowed transition-colors"
                >
                    ▼
                </button>
            </div>

            {/* Etiqueta de fila */}
            <div className="shrink-0 flex flex-col items-center gap-0.5 w-10">
                <span className="w-8 h-8 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center">
                    {row.position}
                </span>
                <span className="text-[9px] text-gray-400">{occupied}/{row.slot_count}</span>
            </div>

            {/* Slots */}
            <div className="w-full min-w-0 flex-1 overflow-x-auto pb-1">
                <div
                    className="grid w-full pt-1"
                    style={{
                        gridTemplateColumns: `repeat(${row.slot_count}, minmax(72px, 1fr))`,
                        gap: '8px',
                    }}
                >
                    {Array.from({ length: row.slot_count }, (_, i) => i + 1).map(pos => {
                        const p = plantingAt(pos)
                        return (
                            <SlotCell
                                key={pos}
                                rowId={row.id}
                                position={pos}
                                planting={p}
                                plantType={p ? ptMap[p.plant_type_id] : undefined}
                                onClick={() => onSlotClick(row.id, pos, p)}
                            />
                        )
                    })}
                </div>
            </div>

            {/* Controles */}
            <div className="flex items-center gap-1 shrink-0 md:ml-2">
                <button
                    onClick={() => changeSlots(1)}
                    disabled={loading}
                    title="Añadir hueco"
                    className="w-7 h-7 rounded-lg bg-green-50 text-green-700 font-bold text-sm hover:bg-green-100 disabled:opacity-40 transition-colors border border-green-200"
                >
                    +
                </button>
                <button
                    onClick={() => changeSlots(-1)}
                    disabled={loading || row.slot_count <= 1}
                    title="Quitar hueco"
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 disabled:opacity-40 transition-colors border border-red-200"
                >
                    −
                </button>
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    title="Eliminar fila"
                    className="w-7 h-7 rounded-lg bg-gray-50 text-gray-400 text-xs hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 transition-colors border border-gray-200 ml-1"
                >
                    🗑
                </button>
            </div>
        </div>
    )
}
