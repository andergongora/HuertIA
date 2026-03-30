import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import type { Garden } from '../types'
import { getGardens, streamChat } from '../api/client'

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    getGardens().then(list => {
      setGardens(list)
      if (list.length > 0) setGardenId(list[0].id)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  async function send(text: string) {
    if (!text.trim() || loading) return
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setError(null)

    const newMessages: Message[] = [...messages, { role: 'user', text }]
    setMessages(newMessages)
    setLoading(true)
    setMessages(prev => [...prev, { role: 'assistant', text: '' }])

    try {
      const res = await streamChat(
        newMessages.map(m => ({ role: m.role, content: m.text })),
        gardenId
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          const parsed = JSON.parse(payload)
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.text) {
            setMessages(prev => {
              const last = prev[prev.length - 1]
              return [...prev.slice(0, -1), { ...last, text: last.text + parsed.text }]
            })
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con la IA.')
      setMessages(prev =>
        prev[prev.length - 1]?.text === '' ? prev.slice(0, -1) : prev
      )
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const isStreaming = loading && messages.length > 0 && messages[messages.length - 1]?.text !== ''

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← Parcela</Link>
          <h1 className="text-lg font-bold text-gray-800">Asistente de huerta</h1>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors"
            >
              Nueva conversación
            </button>
          )}
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
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="text-center pt-8">
              <span className="text-4xl">🌿</span>
              <p className="text-gray-400 text-sm mt-3">
                Pregúntame cualquier cosa sobre tu huerta.
              </p>
              {gardenId && (
                <p className="text-green-600 text-xs mt-1">
                  Tengo contexto de tus cultivos activos.
                </p>
              )}
            </div>
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
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-1">
                <span className="text-sm">🌿</span>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-green-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                msg.text === '' ? (
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                  </span>
                ) : (
                  <div className={`prose prose-sm prose-green max-w-none ${
                    isStreaming && i === messages.length - 1 ? 'after:content-["▋"] after:animate-pulse after:text-green-400' : ''
                  }`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                )
              ) : (
                <span className="whitespace-pre-wrap">{msg.text}</span>
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-center text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 shrink-0">
        <form
          onSubmit={e => { e.preventDefault(); send(input) }}
          className="max-w-2xl mx-auto flex gap-2 items-end"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => { setInput(e.target.value); resizeTextarea() }}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta... (Enter para enviar, Shift+Enter para nueva línea)"
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none overflow-hidden focus:outline-none focus:border-green-400 disabled:opacity-50 max-h-40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors shrink-0"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
