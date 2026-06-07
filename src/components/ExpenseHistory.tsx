import { useCallback, useMemo, useState } from 'react'
import {
  exceedsSixMonthRange,
  filterExpensesByRange,
  sortExpenses,
  subtractMonthsFromDateKey,
  todayDateKey,
  type ExpenseItem,
  type ExpenseSortKey,
} from '../lib/expenseHistoryUtils'

const SORT_OPTIONS: { value: ExpenseSortKey; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'amountDesc', label: '높은 금액순' },
  { value: 'amountAsc', label: '낮은 금액순' },
]

const QUICK_RANGE_MONTHS = [1, 3, 6] as const

function formatKRW(n: number): string {
  return `${Math.floor(n).toLocaleString('ko-KR')}원`
}

function formatDisplayDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return `${y}년 ${m}월 ${d}일`
}

export interface ExpenseHistoryProps {
  onBack: () => void
}

export default function ExpenseHistory({ onBack }: ExpenseHistoryProps) {
  const initialEnd = todayDateKey()
  const initialStart = subtractMonthsFromDateKey(initialEnd, 1)

  const [sortKey, setSortKey] = useState<ExpenseSortKey>('latest')
  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(initialEnd)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [expenses] = useState<ExpenseItem[]>([])

  const validateAndApplyRange = useCallback(
    (nextStart: string, nextEnd: string): boolean => {
      if (exceedsSixMonthRange(nextStart, nextEnd)) {
        window.alert('최대 6개월까지만 조회할 수 있습니다.')
        setRangeError('최대 6개월까지만 조회할 수 있습니다.')
        return false
      }
      setRangeError(null)
      setStartDate(nextStart)
      setEndDate(nextEnd)
      return true
    },
    [],
  )

  const handleStartChange = useCallback(
    (raw: string) => {
      if (!raw) return
      validateAndApplyRange(raw, endDate)
    },
    [endDate, validateAndApplyRange],
  )

  const handleEndChange = useCallback(
    (raw: string) => {
      if (!raw) return
      validateAndApplyRange(startDate, raw)
    },
    [startDate, validateAndApplyRange],
  )

  const handleQuickRange = useCallback(
    (months: number) => {
      const end = endDate || todayDateKey()
      const start = subtractMonthsFromDateKey(end, months)
      validateAndApplyRange(start, end)
    },
    [endDate, validateAndApplyRange],
  )

  const filteredItems = useMemo(() => {
    if (rangeError) return []
    return sortExpenses(
      filterExpensesByRange(expenses, startDate, endDate),
      sortKey,
    )
  }, [expenses, startDate, endDate, sortKey, rangeError])

  const handleAddClick = useCallback(() => {
    window.alert('소비 내역 입력 모달 띄우기')
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-1 py-3">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-base font-bold text-gray-700 transition active:scale-95 active:bg-gray-100"
            aria-label="뒤로가기"
            onClick={onBack}
          >
            ‹
          </button>
          <h1 className="flex-1 text-center text-base font-black tracking-tight text-gray-900 pr-10">
            소비내역
          </h1>
        </div>

        <div className="space-y-3 border-t border-gray-100 px-3 pb-3 pt-3">
          <div>
            <p className="mb-1.5 text-xs font-bold text-gray-500">정렬</p>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as ExpenseSortKey)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-300"
              aria-label="소비 내역 정렬"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold text-gray-500">조회 기간</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartChange(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-300"
                aria-label="시작일"
              />
              <span className="shrink-0 text-xs font-bold text-gray-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndChange(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-300"
                aria-label="종료일"
              />
            </div>
            <div className="mt-2 flex gap-2">
              {QUICK_RANGE_MONTHS.map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => handleQuickRange(months)}
                  className="flex-1 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-xs font-bold text-indigo-700 transition active:scale-[0.98] active:bg-indigo-100"
                >
                  {months}개월
                </button>
              ))}
            </div>
            {rangeError && (
              <p className="mt-2 text-xs font-bold text-red-500">{rangeError}</p>
            )}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-24">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="mb-3 text-4xl leading-none" aria-hidden>
              📭
            </span>
            <p className="text-sm font-semibold">조회된 데이터가 없습니다.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {filteredItems.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-500">
                      {formatDisplayDate(item.date)}
                    </p>
                    <p className="mt-1 truncate text-sm font-black text-gray-900">
                      {item.merchant}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black tabular-nums text-indigo-700">
                    {formatKRW(item.amount)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-1 rounded-full bg-indigo-500 px-4 py-4 text-sm font-black text-white shadow-lg transition-colors hover:bg-indigo-600 active:scale-95"
        aria-label="소비 내역 추가"
        onClick={handleAddClick}
      >
        <span className="text-xl leading-none">+</span>
        <span>추가</span>
      </button>
    </div>
  )
}
