import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Garden } from '../types'
import { getGardens } from '../api/client'
import Dashboard from '../components/Dashboard'

export default function DashboardPage() {
  const [gardens, setGardens] = useState<Garden[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGardens().then(list => {
      setGardens(list)
      if (list.length > 0) setSelectedId(list[0].id)
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← Parcela</Link>
          <Link to="/chat" className="text-sm text-gray-500 hover:text-gray-800 font-medium">Asistente</Link>
          <h1 className="text-lg font-bold text-gray-800">Dashboard</h1>
        </div>
        {gardens.length > 1 && (
          <select
            value={selectedId ?? ''}
            onChange={e => setSelectedId(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
          >
            {gardens.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {loading ? (
          <p className="text-gray-400 text-center py-12">Cargando...</p>
        ) : !selectedId ? (
          <p className="text-gray-400 text-center py-12">
            No hay huertas. <Link to="/" className="text-green-600 underline">Crear una</Link>.
          </p>
        ) : (
          <Dashboard gardenId={selectedId} />
        )}
      </div>
    </div>
  )
}
