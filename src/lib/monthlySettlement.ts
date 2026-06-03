import type { WorkLogEntry, WorkLogsMap } from '../store/useWageStore'

const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'] as const

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDateKey(y: number, m0: number, d: number): string {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 해당 날짜가 속한 주의 일요일(자정 로컬) */
export function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = x.getDay()
  x.setDate(x.getDate() - dow)
  return x
}

function clipWeekRangeToMonth(
  weekStart: Date,
  year: number,
  monthIndex: number,
): { clipStart: Date; clipEnd: Date } {
  const monthFirst = new Date(year, monthIndex, 1)
  const monthLast = new Date(year, monthIndex + 1, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const clipStart = weekStart < monthFirst ? monthFirst : weekStart
  const clipEnd = weekEnd > monthLast ? monthLast : weekEnd
  return { clipStart, clipEnd }
}

export function formatMonthClippedWeekLabel(
  weekStart: Date,
  year: number,
  monthIndex: number,
): string {
  const { clipStart, clipEnd } = clipWeekRangeToMonth(
    weekStart,
    year,
    monthIndex,
  )
  return `${clipStart.getMonth() + 1}/${clipStart.getDate()}–${
    clipEnd.getMonth() + 1
  }/${clipEnd.getDate()}`
}

/** 당월에 속한 모든 일요일 시작 주차에 1..N 부여 (빈 주 포함) */
export function getCalendarWeekOrdinalByStartKey(
  year: number,
  monthIndex: number,
): Map<string, number> {
  const monthFirst = new Date(year, monthIndex, 1)
  const monthLast = new Date(year, monthIndex + 1, 0)
  let ws = startOfWeekSunday(monthFirst)
  const map = new Map<string, number>()
  let ordinal = 0
  for (;;) {
    const we = new Date(ws)
    we.setDate(ws.getDate() + 6)
    if (ws > monthLast) break
    if (we < monthFirst) {
      ws = new Date(ws)
      ws.setDate(ws.getDate() + 7)
      continue
    }
    ordinal += 1
    map.set(
      toDateKey(ws.getFullYear(), ws.getMonth(), ws.getDate()),
      ordinal,
    )
    ws = new Date(ws)
    ws.setDate(ws.getDate() + 7)
  }
  return map
}

export interface WeekDetailRow {
  dateKey: string
  weekdayLabel: string
  entry: WorkLogEntry
}

export interface WeekBucketModel {
  weekIndex: number
  weekStartKey: string
  weekRangeLabel: string
  rows: WeekDetailRow[]
  amountSum: number
  incentiveSum: number
  finalWageSum: number
}

export function buildWeekBuckets(
  workLogs: WorkLogsMap,
  year: number,
  monthIndex: number,
): WeekBucketModel[] {
  const ym = `${year}-${pad2(monthIndex + 1)}`
  const weekOrdinal = getCalendarWeekOrdinalByStartKey(year, monthIndex)

  const monthItems: { dateKey: string; entry: WorkLogEntry }[] = []
  for (const [dateKey, entry] of Object.entries(workLogs)) {
    if (!dateKey.startsWith(ym)) continue
    monthItems.push({ dateKey, entry })
  }

  const byWeek = new Map<string, WeekDetailRow[]>()
  for (const { dateKey, entry } of monthItems) {
    const d = parseDateKey(dateKey)
    const w0 = startOfWeekSunday(d)
    const weekStartKey = toDateKey(
      w0.getFullYear(),
      w0.getMonth(),
      w0.getDate(),
    )
    const row: WeekDetailRow = {
      dateKey,
      weekdayLabel: WEEKDAY_SHORT[d.getDay()],
      entry,
    }
    const list = byWeek.get(weekStartKey)
    if (list) list.push(row)
    else byWeek.set(weekStartKey, [row])
  }

  const sortedKeys = [...byWeek.keys()].sort()
  return sortedKeys.map((weekStartKey) => {
    const rows = byWeek.get(weekStartKey)!
    rows.sort((a, b) => a.dateKey.localeCompare(b.dateKey))

    const weekStart = parseDateKey(weekStartKey)
    const weekRangeLabel = formatMonthClippedWeekLabel(
      weekStart,
      year,
      monthIndex,
    )

    const amountSum = rows.reduce((s, r) => s + r.entry.amount, 0)
    const incentiveSum = rows.reduce((s, r) => s + r.entry.incentive, 0)
    const finalWageSum = rows.reduce((s, r) => s + r.entry.finalWage, 0)

    const weekIndex = weekOrdinal.get(weekStartKey)!
    return {
      weekIndex,
      weekStartKey,
      weekRangeLabel,
      rows,
      amountSum,
      incentiveSum,
      finalWageSum,
    }
  })
}

export interface MonthCategoryTotals {
  amount: number
  incentive: number
}

export function monthCategoryTotals(
  workLogs: WorkLogsMap,
  ymPrefix: string,
): MonthCategoryTotals {
  let amount = 0
  let incentive = 0
  for (const [k, e] of Object.entries(workLogs)) {
    if (!k.startsWith(ymPrefix)) continue
    amount += e.amount
    incentive += e.incentive
  }
  return { amount, incentive }
}

/** 당월 일별 최종 급여 합계 (= 템플릿 입금액 + 인센티브) */
export function sumMonthlyTotalIncome(
  workLogs: WorkLogsMap,
  year: number,
  monthIndex: number,
): number {
  const ym = `${year}-${pad2(monthIndex + 1)}`
  let sum = 0
  for (const [key, entry] of Object.entries(workLogs)) {
    if (key.startsWith(ym)) sum += entry.finalWage
  }
  return sum
}
