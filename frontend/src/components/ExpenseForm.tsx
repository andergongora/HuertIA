import { useState } from 'react'
import type { Expense } from '../types'
import { createExpense } from '../api/client'

const CATEGORIES = ['semillas', 'herramientas', 'abono', 'riego', 'pesticidas', 'estructura', 'alquiler', 'otros']

interface Props {
  gardenId: string
  onCreated: (expense: Expense) => void
}

export default function ExpenseForm({ gardenId, onCreated }: Props) {
  const [category, setCategory] = useState('semillas')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const expense = await createExpense({
        garden_id: gardenId,
        category,
        amount: parseFloat(amount),
        description,
        date,
      })
      setAmount('')
      setDescription('')
      setOpen(false)
      onCreated(expense)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-green-700 hover:text-green-900 font-medium flex items-center gap-1"
      >
        + Registrar gasto
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-800 text-sm">Nuevo gasto</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoría</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Importe (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Descripción</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
          placeholder="Ej. Semillas de tomate cherry"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar gasto'}
      </button>
    </form>
  )
}
