import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts'
import type { Expense, PlantingEvent, PlantType, Planting } from '../types'
import { getExpenses, getPlantings, getPlantTypes, getEvents } from '../api/client'

interface Props {
  gardenId: string
}

interface HarvestData {
  name: string
  kg: number
  uds: number
}

interface PlantingSummary {
  id: string
  label: string
  plantedAt: string
  status: string
  events: number
  kg: number
  uds: number
  lastEvent: string | null
}

const STATUS_PALETTE = ['#4ade80', '#60a5fa', '#f87171']

export default function Dashboard({ gardenId }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [plantings, setPlantings] = useState<Planting[]>([])
  const [allEvents, setAllEvents] = useState<PlantingEvent[]>([])
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [exp, pList, ptList] = await Promise.all([
          getExpenses(gardenId),
          getPlantings(gardenId),
          getPlantTypes(),
        ])
        setExpenses(exp)
        setPlantings(pList)
        setPlantTypes(ptList)

        const evsByPlanting = await Promise.all(pList.map((p: Planting) => getEvents(p.id)))
        setAllEvents(evsByPlanting.flat())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [gardenId])

  if (loading) return <p className="text-gray-400 text-sm text-center py-12">Cargando datos...</p>

  const ptMap = Object.fromEntries(plantTypes.map(pt => [pt.id, pt]))
  const evsByPlanting = allEvents.reduce<Record<string, PlantingEvent[]>>((acc, e) => {
    ;(acc[e.planting_id] ??= []).push(e)
    return acc
  }, {})

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const activeCount = plantings.filter(p => p.status === 'active').length
  const harvestedCount = plantings.filter(p => p.status === 'harvested').length
  const lostCount = plantings.filter(p => p.status === 'lost').length
  const successRate = harvestedCount + lostCount > 0
    ? Math.round((harvestedCount / (harvestedCount + lostCount)) * 100)
    : null

  const harvestEvents = allEvents.filter(e => e.event_type === 'harvest' && e.quantity != null)
  const totalKg = harvestEvents
    .filter(e => e.unit === 'kg' || e.unit === 'g')
    .reduce((s, e) => s + (e.unit === 'g' ? e.quantity! / 1000 : e.quantity!), 0)
  const costPerKg = totalKg > 0 ? totalSpent / totalKg : null

  // ── Harvest by plant type ────────────────────────────────────────────────────
  const harvestMap: Record<string, HarvestData> = {}
  for (const ev of harvestEvents) {
    const p = plantings.find(p => p.id === ev.planting_id)
    if (!p) continue
    const pt = ptMap[p.plant_type_id]
    const name = pt ? `${pt.name}${pt.variety ? ` (${pt.variety})` : ''}` : '?'
    if (!harvestMap[name]) harvestMap[name] = { name, kg: 0, uds: 0 }
    if (ev.unit === 'kg' || ev.unit === 'g') {
      harvestMap[name].kg += ev.unit === 'g' ? ev.quantity! / 1000 : ev.quantity!
    } else {
      harvestMap[name].uds += ev.quantity!
    }
  }
  const harvestData = Object.values(harvestMap)

  // ── Activity by month (all events) ──────────────────────────────────────────
  const activityMap: Record<string, number> = {}
  for (const ev of allEvents) {
    const month = ev.created_at.slice(0, 7)
    activityMap[month] = (activityMap[month] ?? 0) + 1
  }
  const activityData = Object.entries(activityMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, eventos]) => ({ month, eventos }))

  // ── Expenses by category ─────────────────────────────────────────────────────
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})
  const categoryData = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([name, total]) => ({ name, total }))

  // ── Cumulative expenses ──────────────────────────────────────────────────────
  const monthlyMap: Record<string, number> = {}
  for (const e of expenses) {
    const month = e.date.slice(0, 7)
    monthlyMap[month] = (monthlyMap[month] ?? 0) + e.amount
  }
  let cum = 0
  const cumulativeData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => { cum += amount; return { month, acumulado: parseFloat(cum.toFixed(2)) } })

  // ── Status pie ───────────────────────────────────────────────────────────────
  const statusData = [
    { name: 'Activos', value: activeCount },
    { name: 'Cosechados', value: harvestedCount },
    { name: 'Perdidos', value: lostCount },
  ].filter(d => d.value > 0)

  // ── Per-planting summary table ───────────────────────────────────────────────
  const summaryRows: PlantingSummary[] = plantings.map(p => {
    const pt = ptMap[p.plant_type_id]
    const evs: PlantingEvent[] = evsByPlanting[p.id] ?? []
    const harvEvs = evs.filter((e: PlantingEvent) => e.event_type === 'harvest' && e.quantity != null)
    const kg = harvEvs
      .filter((e: PlantingEvent) => e.unit === 'kg' || e.unit === 'g')
      .reduce((s: number, e: PlantingEvent) => s + (e.unit === 'g' ? e.quantity! / 1000 : e.quantity!), 0)
    const uds = harvEvs
      .filter((e: PlantingEvent) => e.unit !== 'kg' && e.unit !== 'g')
      .reduce((s: number, e: PlantingEvent) => s + e.quantity!, 0)
    const last = evs.length > 0
      ? evs.slice().sort((a: PlantingEvent, b: PlantingEvent) => b.created_at.localeCompare(a.created_at))[0].created_at
      : null
    return {
      id: p.id,
      label: pt ? `${pt.name}${pt.variety ? ` (${pt.variety})` : ''}` : '?',
      plantedAt: p.planted_at,
      status: p.status,
      events: evs.length,
      kg: parseFloat(kg.toFixed(2)),
      uds,
      lastEvent: last,
    }
  })

  // ── Recent harvests ──────────────────────────────────────────────────────────
  const recentHarvests = harvestEvents
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)
    .map(ev => {
      const p = plantings.find(p => p.id === ev.planting_id)
      const pt = p ? ptMap[p.plant_type_id] : undefined
      return {
        id: ev.id,
        label: pt ? `${pt.name}${pt.variety ? ` (${pt.variety})` : ''}` : '?',
        quantity: ev.quantity!,
        unit: ev.unit ?? '',
        date: ev.created_at.slice(0, 10),
      }
    })

  const STATUS_LABEL: Record<string, string> = { active: 'activo', harvested: 'cosechado', lost: 'perdido' }
  const STATUS_COLOR: Record<string, string> = {
    active: 'text-green-600',
    harvested: 'text-blue-600',
    lost: 'text-red-500',
  }

  return (
    <div className="space-y-8">

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total gastado" value={`${totalSpent.toFixed(2)} €`} color="text-gray-800" />
        <KpiCard label="Total cosechado" value={`${totalKg.toFixed(1)} kg`} color="text-green-700" />
        <KpiCard
          label="Tasa de éxito"
          value={successRate != null ? `${successRate}%` : '—'}
          color={successRate != null && successRate >= 70 ? 'text-green-700' : 'text-amber-600'}
          sub={harvestedCount + lostCount > 0 ? `${harvestedCount} cosechados / ${lostCount} perdidos` : undefined}
        />
        <KpiCard
          label="Coste / kg"
          value={costPerKg != null ? `${costPerKg.toFixed(2)} €` : '—'}
          color="text-purple-700"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Cultivos activos" value={String(activeCount)} color="text-green-700" />
        <KpiCard label="Eventos totales" value={String(allEvents.length)} color="text-gray-700" />
        <KpiCard label="Gastos registrados" value={String(expenses.length)} color="text-gray-700" />
        <KpiCard label="Tipos de planta" value={String(new Set(plantings.map(p => p.plant_type_id)).size)} color="text-gray-700" />
      </div>

      {/* ── Status pie + recent harvests ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statusData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado de los cultivos</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={STATUS_PALETTE[i % STATUS_PALETTE.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {recentHarvests.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Últimas cosechas</h3>
            <ul className="space-y-2">
              {recentHarvests.map(h => (
                <li key={h.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{h.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-green-700">{h.quantity} {h.unit}</span>
                    <span className="text-xs text-gray-400">{h.date}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Activity by month ── */}
      {activityData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Actividad mensual (eventos registrados)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="eventos" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Harvest by plant type ── */}
      {harvestData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Cosecha por cultivo (kg)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={harvestData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="kg" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Expenses by category ── */}
      {categoryData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Gastos por categoría</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}€`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} />
                <Bar dataKey="total" fill="#60a5fa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {cumulativeData.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Gastos acumulados</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}€`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} />
                  <Legend />
                  <Line type="monotone" dataKey="acumulado" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Per-planting table ── */}
      {summaryRows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 overflow-x-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumen por cultivo</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Cultivo</th>
                <th className="text-left pb-2 font-medium">Plantado</th>
                <th className="text-left pb-2 font-medium">Estado</th>
                <th className="text-right pb-2 font-medium">Eventos</th>
                <th className="text-right pb-2 font-medium">Cosecha</th>
                <th className="text-left pb-2 font-medium pl-4">Último evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summaryRows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-800">{r.label}</td>
                  <td className="py-2 text-gray-500">{r.plantedAt}</td>
                  <td className={`py-2 font-medium ${STATUS_COLOR[r.status] ?? 'text-gray-500'}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </td>
                  <td className="py-2 text-right text-gray-600">{r.events}</td>
                  <td className="py-2 text-right font-medium text-green-700">
                    {r.kg > 0 ? `${r.kg} kg` : r.uds > 0 ? `${r.uds} uds` : '—'}
                  </td>
                  <td className="py-2 pl-4 text-gray-400 text-xs">
                    {r.lastEvent ? r.lastEvent.slice(0, 10) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
