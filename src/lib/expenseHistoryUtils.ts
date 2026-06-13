export type ExpenseSortKey = 'latest' | 'amountDesc' | 'amountAsc'

export interface ExpenseItem {
  id: string
  /** YYYY-MM-DD */
  date: string
  category: string
  content: string
  amount: number
}

export function createExpenseId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** 저장·합산 시 금액을 원 단위 정수로 보정 */
export function toExpenseAmount(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.floor(n)
}

/** 당월 소비 내역 금액 합계 */
export function sumMonthlyExpenses(
  expenses: ExpenseItem[],
  year: number,
  monthIndex: number,
): number {
  const ym = `${year}-${pad2(monthIndex + 1)}`
  let sum = 0
  for (const item of expenses) {
    if (!item.date.startsWith(ym)) continue
    sum += toExpenseAmount(item.amount)
  }
  return sum
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 로컬 날짜 → YYYY-MM-DD */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayDateKey(): string {
  return toDateKey(new Date())
}

/** 종료일 기준 N개월 전 시작일 (로컬) */
export function subtractMonthsFromDateKey(endKey: string, months: number): string {
  const end = parseDateKey(endKey)
  const start = new Date(end.getFullYear(), end.getMonth() - months, end.getDate())
  return toDateKey(start)
}

/**
 * 시작일~종료일 범위가 6개월을 초과하는지 검증.
 * 종료일이 시작일보다 이전이면 true(유효하지 않음).
 */
export function exceedsSixMonthRange(startKey: string, endKey: string): boolean {
  const start = parseDateKey(startKey)
  const end = parseDateKey(endKey)
  if (end < start) return true
  const maxEnd = new Date(start.getFullYear(), start.getMonth() + 6, start.getDate())
  return end > maxEnd
}

export function isDateInRange(
  dateKey: string,
  startKey: string,
  endKey: string,
): boolean {
  const d = parseDateKey(dateKey).getTime()
  const s = parseDateKey(startKey).getTime()
  const e = parseDateKey(endKey).getTime()
  return d >= s && d <= e
}

export function sortExpenses(
  items: ExpenseItem[],
  sortKey: ExpenseSortKey,
): ExpenseItem[] {
  const list = [...items]
  switch (sortKey) {
    case 'latest':
      return list.sort(
        (a, b) => parseDateKey(b.date).getTime() - parseDateKey(a.date).getTime(),
      )
    case 'amountDesc':
      return list.sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount
        return parseDateKey(b.date).getTime() - parseDateKey(a.date).getTime()
      })
    case 'amountAsc':
      return list.sort((a, b) => {
        if (a.amount !== b.amount) return a.amount - b.amount
        return parseDateKey(b.date).getTime() - parseDateKey(a.date).getTime()
      })
  }
}

export function filterExpensesByRange(
  items: ExpenseItem[],
  startKey: string,
  endKey: string,
): ExpenseItem[] {
  return items.filter((item) => isDateInRange(item.date, startKey, endKey))
}
