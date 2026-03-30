import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { Garden, Row, Planting, PlantType, Expense } from '../types'
import {
    getGardens, createGarden, getRows, getPlantings,
    getPlantTypes, getExpenses, deleteExpense,
} from '../api/client'
import GardenGrid from '../components/GardenGrid'
import ExpenseForm from '../components/ExpenseForm'

export default function GardenPage() {
    const { id } = useParams<{ id?: string }>()
    const navigate = useNavigate()

    const [gardens, setGardens] = useState<Garden[]>([])
    const [garden, setGarden] = useState<Garden | null>(null)
    const [rows, setRows] = useState<Row[]>([])
    const [plantings, setPlantings] = useState<Planting[]>([])
    const [plantTypes, setPlantTypes] = useState<PlantType[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [newName, setNewName] = useState('')
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'grid' | 'expenses'>('grid')

    useEffect(() => {
        loadGardens()
    }, [])

    useEffect(() => {
        if (id) loadGardenData(id)
    }, [id])

    async function loadGardens() {
        const list = await getGardens()
        setGardens(list)
        if (!id && list.length > 0) navigate(`/gardens/${list[0].id}`, { replace: true })
        setLoading(false)
    }

    async function loadGardenData(gardenId: string) {
        setLoading(true)
        const [g, r, p, pt, exp] = await Promise.all([
            getGardens().then(list => list.find(g => g.id === gardenId) ?? null),
            getRows(gardenId),
            getPlantings(gardenId),
            getPlantTypes(),
            getExpenses(gardenId),
        ])
        setGarden(g)
        setRows(r)
        setPlantings(p)
        setPlantTypes(pt)
        setExpenses(exp)
        setLoading(false)
    }

    async function handleCreateGarden(e: React.FormEvent) {
        e.preventDefault()
        const g = await createGarden(newName)
        setNewName('')
        navigate(`/gardens/${g.id}`)
    }

    function refresh() {
        if (id) loadGardenData(id)
    }

    // Upcoming harvests
    const upcomingHarvests = plantings
        .filter(p => p.status === 'active')
        .map(p => {
            const pt = plantTypes.find(t => t.id === p.plant_type_id)
            if (!pt?.days_to_harvest) return null
            const harvestDate = new Date(p.planted_at)
            harvestDate.setDate(harvestDate.getDate() + pt.days_to_harvest)
            const daysLeft = Math.ceil((harvestDate.getTime() - Date.now()) / 86400000)
            return { planting: p, pt, daysLeft, harvestDate }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null && x.daysLeft <= 30)
        .sort((a, b) => a.daysLeft - b.daysLeft)

    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Cargando...</div>
    }

    return (
        <div className="min-h-screen bg-slate-50 overflow-x-hidden">
            {/* Header con gradiente */}
            <header className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold text-white tracking-tight">🌱 HuertAI</h1>
                    {gardens.length > 1 && (
                        <select
                            value={id ?? ''}
                            onChange={e => navigate(`/gardens/${e.target.value}`)}
                            className="text-sm bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 focus:outline-none"
                        >
                            {gardens.map(g => <option key={g.id} value={g.id} className="text-gray-800">{g.name}</option>)}
                        </select>
                    )}
                </div>
                <nav className="flex items-center gap-1">
                    {[
                        { to: '/chat', label: '💬 Asistente' },
                        { to: '/dashboard', label: '📊 Dashboard' },
                    ].map(({ to, label }) => (
                        <Link
                            key={to}
                            to={to}
                            className="text-sm text-white/80 hover:text-white hover:bg-white/15 px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                            {label}
                        </Link>
                    ))}
                </nav>
            </header>

            <div className="w-full px-6 py-6 space-y-5">

                <div className="w-full flex justify-center">
                    <div className="w-full max-w-[1600px]">
                        {!id ? (
                            /* No garden selected */
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center space-y-5">
                                <p className="text-5xl">🌱</p>
                                <p className="text-gray-500 font-medium">No hay huertas todavía. Crea la primera.</p>
                                <form onSubmit={handleCreateGarden} className="flex gap-2 max-w-sm mx-auto">
                                    <input
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        required
                                        placeholder="Nombre de tu huerta"
                                        className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
                                    />
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 shadow-sm"
                                    >
                                        Crear
                                    </button>
                                </form>
                            </div>
                        ) : garden ? (
                            <>
                                {/* Tabs pill */}
                                <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 w-fit">
                                    {(['grid', 'expenses'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setTab(t)}
                                            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === t
                                                ? 'bg-green-600 text-white shadow-sm'
                                                : 'text-gray-500 hover:text-gray-800'
                                                }`}
                                        >
                                            {{ grid: '🌿 Parcela', expenses: '💶 Gastos' }[t]}
                                        </button>
                                    ))}
                                </div>

                                {tab === 'grid' && (
                                    <div className="flex gap-6 items-start w-full">
                                        <div className="flex-1 min-w-0 flex justify-start">
                                            <div className="w-full">
                                                <GardenGrid
                                                    garden={garden}
                                                    rows={rows}
                                                    plantings={plantings}
                                                    plantTypes={plantTypes}
                                                    onRefresh={refresh}
                                                />
                                            </div>
                                        </div>

                                        {/* Sidebar */}
                                        <div className="w-80 shrink-0 hidden lg:block space-y-4">
                                            {/* Stat cards */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { label: 'Activos', value: plantings.filter(p => p.status === 'active').length, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
                                                    { label: 'Cosechados', value: plantings.filter(p => p.status === 'harvested').length, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
                                                    { label: 'Perdidos', value: plantings.filter(p => p.status === 'lost').length, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
                                                ].map(s => (
                                                    <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
                                                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                                                        <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Upcoming harvests */}
                                            {upcomingHarvests.length > 0 && (
                                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
                                                    <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                                                        🌾 Próximas cosechas
                                                    </h3>
                                                    <ul className="space-y-2">
                                                        {upcomingHarvests.slice(0, 5).map(({ planting, pt, daysLeft }) => (
                                                            <li key={planting.id} className="flex items-center justify-between">
                                                                <Link
                                                                    to={`/plantings/${planting.id}`}
                                                                    className="text-xs text-amber-800 hover:underline font-medium truncate"
                                                                >
                                                                    {pt.name}{pt.variety ? ` (${pt.variety})` : ''}
                                                                </Link>
                                                                <span className={`text-xs font-bold ml-2 shrink-0 px-2 py-0.5 rounded-full ${daysLeft <= 0 ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                                                                    {daysLeft <= 0 ? '¡Lista!' : `${daysLeft}d`}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Nueva huerta */}
                                            <div className="bg-white border border-gray-100 rounded-2xl p-4">
                                                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Nueva huerta</p>
                                                <form onSubmit={handleCreateGarden} className="flex gap-2">
                                                    <input
                                                        value={newName}
                                                        onChange={e => setNewName(e.target.value)}
                                                        placeholder="Nombre..."
                                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-400"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!newName}
                                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-40"
                                                    >
                                                        +
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {tab === 'expenses' && (
                                    <div className="space-y-4">
                                        <ExpenseForm gardenId={garden.id} onCreated={e => setExpenses(prev => [...prev, e])} />
                                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                                            {expenses.length === 0 ? (
                                                <p className="text-gray-400 text-sm text-center py-8">Sin gastos registrados.</p>
                                            ) : (
                                                expenses.map(exp => (
                                                    <div key={exp.id} className="flex items-center justify-between px-4 py-3 text-sm">
                                                        <div>
                                                            <span className="font-medium text-gray-800">{exp.description}</span>
                                                            <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{exp.category}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-semibold text-gray-800">{exp.amount.toFixed(2)} €</span>
                                                            <span className="text-xs text-gray-400">{exp.date}</span>
                                                            <button
                                                                onClick={async () => {
                                                                    await deleteExpense(exp.id)
                                                                    setExpenses(prev => prev.filter(e => e.id !== exp.id))
                                                                }}
                                                                className="text-red-400 hover:text-red-600 text-xs"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="text-right text-sm font-semibold text-gray-700">
                                            Total: {expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)} €
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-400 text-center py-12">Huerta no encontrada.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
