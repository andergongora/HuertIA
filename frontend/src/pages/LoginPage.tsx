import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password)
      navigate('/gardens', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <span className="text-4xl">🌿</span>
          <h1 className="text-2xl font-bold text-green-800 mt-2">HuertAI</h1>
          <p className="text-sm text-gray-500 mt-1">Tu huerto inteligente</p>
        </div>

        <div className="flex rounded-lg bg-green-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError('') }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'login' ? 'bg-white text-green-800 shadow-sm' : 'text-green-700'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError('') }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'register' ? 'bg-white text-green-800 shadow-sm' : 'text-green-700'
            }`}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}
