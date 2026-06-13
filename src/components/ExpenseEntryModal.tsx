import { useCallback, useEffect, useMemo, useState } from 'react'
import { todayDateKey, toExpenseAmount, type ExpenseItem } from '../lib/expenseHistoryUtils'

const DEFAULT_CATEGORIES = [
  '외식',
  '배달',
  '간식',
  '통신비',
  '공과금',
  '쇼핑',
] as const

export type ExpenseEntryDraft = Omit<ExpenseItem, 'id'>

function parseAmountInput(raw: string): number {
  return toExpenseAmount(raw.replace(/\D/g, ''))
}

export interface ExpenseEntryModalProps {
  open: boolean
  onClose: () => void
  onSave: (entry: ExpenseEntryDraft) => void
}

export default function ExpenseEntryModal({
  open,
  onClose,
  onSave,
}: ExpenseEntryModalProps) {
  const [sheetVisible, setSheetVisible] = useState(false)
  const [expenseDate, setExpenseDate] = useState(todayDateKey())
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [customCategories, setCustomCategories] = useState<string[]>([])

  const resetForm = useCallback(() => {
    setExpenseDate(todayDateKey())
    setCategory('')
    setContent('')
    setAmountRaw('')
    setCategoryOpen(false)
    setCategorySearch('')
  }, [])

  useEffect(() => {
    if (!open) {
      const id = requestAnimationFrame(() => setSheetVisible(false))
      return () => cancelAnimationFrame(id)
    }
    resetForm()
    const id = requestAnimationFrame(() => setSheetVisible(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = prev
    }
  }, [open, resetForm])

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

  const closeAnimated = useCallback(() => {
    setSheetVisible(false)
    window.setTimeout(() => {
      onClose()
      resetForm()
    }, 320)
  }, [onClose, resetForm])

  const closeImmediate = useCallback(() => {
    resetForm()
    setSheetVisible(false)
    onClose()
  }, [onClose, resetForm])

  const handleSubmit = useCallback(() => {
    const trimmedCategory = category.trim()
    const trimmedContent = content.trim()
    if (!trimmedCategory || !trimmedContent || amount <= 0) {
      window.alert('모든 항목을 입력해주세요.')
      return
    }
    onSave({
      date: expenseDate,
      category: trimmedCategory,
      content: trimmedContent,
      amount,
    })
    closeAnimated()
  }, [category, content, amount, expenseDate, onSave, closeAnimated])

  if (!open && !sheetVisible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] ${open ? 'visible' : 'invisible'} ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full border-none bg-slate-900/50 backdrop-blur-[3px]"
        aria-label="닫기"
        onClick={closeImmediate}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-[env(safe-area-inset-bottom,0px)]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-entry-title"
          className={`pointer-events-auto flex w-full max-w-[480px] max-h-[94dvh] flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-black/5 bg-white shadow-[0_-12px_48px_rgba(15,23,42,0.24)] transition-transform duration-[340ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
            sheetVisible && open ? 'translate-y-0' : 'translate-y-[108%]'
          }`}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-[5px] w-11 rounded-full bg-gray-200" />
          </div>

          <div className="relative shrink-0 border-b border-gray-100 px-4 pb-4 pt-1">
            <h2
              id="expense-entry-title"
              className="text-center text-base font-black tracking-tight text-gray-900"
            >
              소비내역 추가
            </h2>
            <button
              type="button"
              className="absolute right-3 top-0 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl font-light text-gray-700 transition active:scale-95 active:bg-gray-100"
              aria-label="닫기"
              onClick={closeImmediate}
            >
              ×
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-gray-500">날짜</span>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </label>

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
          </div>

          <div className="shrink-0 border-t border-gray-100 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              className="w-full rounded-2xl bg-indigo-500 py-4 text-base font-black text-white shadow-[0_10px_28px_rgba(79,70,229,0.38)] transition active:scale-[0.99] active:bg-indigo-600"
              onClick={handleSubmit}
            >
              소비내역 저장하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
