import { useCallback, useMemo, useState } from 'react'
import { toExpenseAmount } from '../lib/expenseHistoryUtils'

const DEFAULT_CATEGORIES = [
  '외식',
  '배달',
  '간식',
  '통신비',
  '공과금',
  '쇼핑',
] as const

export type ExpenseEntryDraft = {
  date: string
  category: string
  content: string
  amount: number
}

function parseAmountInput(raw: string): number {
  return toExpenseAmount(raw.replace(/\D/g, ''))
}

export interface ExpenseEntryFormProps {
  initialDate: string
  lockDate?: boolean
  initialValues?: ExpenseEntryDraft
  onSave: (entry: ExpenseEntryDraft) => void
  submitLabel?: string
  onCancel?: () => void
  cancelLabel?: string
}

export default function ExpenseEntryForm({
  initialDate,
  lockDate = false,
  initialValues,
  onSave,
  submitLabel = '소비내역 저장하기',
  onCancel,
  cancelLabel = '목록으로',
}: ExpenseEntryFormProps) {
  const [expenseDate, setExpenseDate] = useState(
    initialValues?.date ?? initialDate,
  )
  const [category, setCategory] = useState(initialValues?.category ?? '')
  const [content, setContent] = useState(initialValues?.content ?? '')
  const [amountRaw, setAmountRaw] = useState(
    initialValues?.amount && initialValues.amount > 0
      ? String(initialValues.amount)
      : '',
  )
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const cat = initialValues?.category?.trim()
    if (!cat) return []
    return DEFAULT_CATEGORIES.includes(cat as (typeof DEFAULT_CATEGORIES)[number])
      ? []
      : [cat]
  })

  const resetForm = useCallback(() => {
    setExpenseDate(initialDate)
    setCategory('')
    setContent('')
    setAmountRaw('')
    setCategoryOpen(false)
    setCategorySearch('')
  }, [initialDate])

  const allCategories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...customCategories],
    [customCategories],
  )

  const amount = useMemo(() => parseAmountInput(amountRaw), [amountRaw])

  const handleAmountChange = useCallback((raw: string) => {
    setAmountRaw(raw.replace(/\D/g, ''))
  }, [])

  const handleSelectCategory = useCallback((label: string) => {
    setCategory(label)
    setCategoryOpen(false)
    setCategorySearch('')
  }, [])

  const handleSaveCustomCategory = useCallback(() => {
    const trimmed = categorySearch.trim()
    if (!trimmed) return
    setCustomCategories((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed],
    )
    setCategory(trimmed)
    setCategorySearch('')
    setCategoryOpen(false)
  }, [categorySearch])

  const handleSubmit = useCallback(() => {
    const trimmedCategory = category.trim()
    const trimmedContent = content.trim()
    if (!trimmedCategory || !trimmedContent || amount <= 0) {
      window.alert('모든 항목을 입력해주세요.')
      return
    }
    onSave({
      date: lockDate ? initialDate : expenseDate,
      category: trimmedCategory,
      content: trimmedContent,
      amount,
    })
    resetForm()
  }, [
    category,
    content,
    amount,
    expenseDate,
    initialDate,
    lockDate,
    onSave,
    resetForm,
  ])

  return (
    <div className="flex flex-col gap-4">
      {!lockDate && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-gray-500">날짜</span>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </label>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-gray-500">구분</span>
        <div className="flex items-center gap-2">
          <div className="flex min-h-[52px] min-w-0 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            {category ? (
              <span className="inline-flex max-w-full items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                {category}
              </span>
            ) : (
              <span className="text-sm font-semibold text-gray-400">
                구분을 선택하거나 추가하세요
              </span>
            )}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-xs font-black text-indigo-700 transition active:scale-[0.98] active:bg-indigo-100"
            onClick={() => setCategoryOpen((v) => !v)}
          >
            {categoryOpen ? '닫기' : '+ 추가'}
          </button>
        </div>

        {categoryOpen && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="검색 또는 직접 입력"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                type="button"
                className="shrink-0 rounded-xl bg-indigo-500 px-3 py-2.5 text-xs font-black text-white transition active:scale-[0.98] active:bg-indigo-600"
                onClick={handleSaveCustomCategory}
              >
                저장
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-bold transition active:scale-[0.97] ${
                    category === cat
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-gray-500">내용</span>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="어디서 사용했나요? (예: 스타벅스, 이마트)"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-800 outline-none placeholder:font-semibold placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-300"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-gray-500">금액</span>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={amountRaw}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="숫자만 입력하세요"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-3 pr-10 text-sm font-bold text-gray-900 outline-none placeholder:font-semibold placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-300"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
            원
          </span>
        </div>
      </label>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          className="w-full rounded-2xl bg-indigo-500 py-4 text-base font-black text-white shadow-[0_10px_28px_rgba(79,70,229,0.38)] transition active:scale-[0.99] active:bg-indigo-600"
          onClick={handleSubmit}
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-bold text-gray-600 transition active:scale-[0.99] active:bg-gray-100"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </div>
  )
}
