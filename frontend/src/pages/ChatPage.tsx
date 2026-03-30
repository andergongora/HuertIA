import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Garden } from '../types'
import { getGardens, sendChatMessage } from '../api/client'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const SUGGESTIONS = [
  '¿Cuándo debo regar mis tomates?',
  '¿Qué plagas son comunes en la lechuga?',
  '¿Cómo sé si mis plantas tienen falta de nitrógeno?',
  '¿Cuándo es buen momento para trasplantar?',
]

export default function ChatPage() {
  const [gardens, setGardens] = useState<Garden[]>([])
  const [gardenId, setGardenId] = useState<string | undefined>()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getGardens().then(list => {
      setGardens(list)
      if (list.length > 0) setGardenId(list[0].id)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    if (!text.trim() || loading) return
    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)
    try {
      const { reply } = await sendChatMessage(text, gardenId)
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con la IA.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← Parcela</Link>
          <h1 className="text-lg font-bold text-gray-800">Asistente de huerta</h1>
        </div>
        {gardens.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Contexto:</span>
            <select
              value={gardenId ?? ''}
              onChange={e => setGardenId(e.target.value || undefined)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
            >
              <option value="">Sin contexto</option>
              {gardens.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-center text-gray-400 text-sm pt-8">
              Pregúntame cualquier cosa sobre tu huerta.
              {gardenId && <span className="block mt-1 text-green-600">Tengo contexto de tus cultivos activos.</span>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-600 hover:border-green-300 hover:text-green-800 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-green-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.role === 'assistant' && (
                <span className="block text-[10px] font-semibold text-green-600 mb-1 uppercase tracking-wide">
                  Agrónomo IA
                </span>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <span className="flex gap-1 items-center text-gray-400 text-sm">
                <span className="animate-bounce delay-0">●</span>
                <span className="animate-bounce delay-100">●</span>
                <span className="animate-bounce delay-200">●</span>
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
