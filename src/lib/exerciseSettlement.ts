import type {
  ExerciseItem,
  ExerciseRecordsMap,
} from '../data/exerciseTemplates'
import { formatExerciseSummary } from '../data/exerciseTemplates'
import {
  formatMonthClippedWeekLabel,
  getCalendarWeekOrdinalByStartKey,
  pad2,
  parseDateKey,
  startOfWeekSunday,
  toDateKey,
} from './monthlySettlement'

export interface ExerciseDayGroup {
  dateKey: string
  weekdayLabel: string
  exercises: ExerciseItem[]
}

export interface ExerciseWeekBucket {
  weekIndex: number
  weekStartKey: string
  /** 달력상 일~토 전체 범위 (예: 8/30~9/5) */
  weekRangeLabel: string
  /** 당월에 속하는 구간 라벨 (참고용) */
  monthClippedLabel: string
  workoutDays: number
  totalMinutes: number
  totalDistanceKm: number
  uniqueTypeCount: number
  dayGroups: ExerciseDayGroup[]
}

export interface MonthlyExerciseTotals {
  workoutDays: number
  totalMinutes: number
  totalDistanceKm: number
  sessionCount: number
}

const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'] as const

function formatFullWeekRangeLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  return `${weekStart.getMonth() + 1}/${weekStart.getDate()}~${
    weekEnd.getMonth() + 1
  }/${weekEnd.getDate()}`
}

/** 한 건의 운동에서 분 단위 시간 기여분 (time: minutes, timeSets: seconds→분) */
function exerciseMinutesContribution(ex: ExerciseItem): number {
  const minutes = Number(ex.minutes) || 0
  const seconds = Number(ex.seconds) || 0
  return minutes + seconds / 60
}

function exerciseDistanceContribution(ex: ExerciseItem): number {
  if (ex.distance == null || String(ex.distance) === '') return 0
  return Number(ex.distance) || 0
}

export function sumMonthlyExerciseTotals(
  records: ExerciseRecordsMap,
  year: number,
  monthIndex: number,
): MonthlyExerciseTotals {
  const ym = `${year}-${pad2(monthIndex + 1)}`
  let workoutDays = 0
  let totalMinutes = 0
  let totalDistanceKm = 0
  let sessionCount = 0

  for (const [key, day] of Object.entries(records)) {
    if (!key.startsWith(ym)) continue
    if (!day?.exercises?.length) continue
    workoutDays += 1
    for (const ex of day.exercises) {
      sessionCount += 1
      totalMinutes += exerciseMinutesContribution(ex)
      totalDistanceKm += exerciseDistanceContribution(ex)
    }
  }

  return {
    workoutDays,
    totalMinutes: Math.round(totalMinutes),
    totalDistanceKm,
    sessionCount,
  }
}

/**
 * 선택한 달의 모든 달력 주차(일~토)를 만들고,
 * 집계는 해당 월 1일~말일 날짜의 운동만 반영한다.
 */
export function buildExerciseWeekBuckets(
  records: ExerciseRecordsMap,
  year: number,
  monthIndex: number,
): ExerciseWeekBucket[] {
  const ym = `${year}-${pad2(monthIndex + 1)}`
  const weekOrdinal = getCalendarWeekOrdinalByStartKey(year, monthIndex)

  const monthDays: { dateKey: string; exercises: ExerciseItem[] }[] = []
  for (const [dateKey, day] of Object.entries(records)) {
    if (!dateKey.startsWith(ym)) continue
    if (!day?.exercises?.length) continue
    monthDays.push({ dateKey, exercises: day.exercises })
  }

  const byWeek = new Map<string, ExerciseDayGroup[]>()
  for (const { dateKey, exercises } of monthDays) {
    const d = parseDateKey(dateKey)
    const w0 = startOfWeekSunday(d)
    const weekStartKey = toDateKey(
      w0.getFullYear(),
      w0.getMonth(),
      w0.getDate(),
    )
    const group: ExerciseDayGroup = {
      dateKey,
      weekdayLabel: WEEKDAY_SHORT[d.getDay()],
      exercises,
    }
    const list = byWeek.get(weekStartKey)
    if (list) list.push(group)
    else byWeek.set(weekStartKey, [group])
  }

  const sortedWeekStarts = [...weekOrdinal.keys()].sort()

  return sortedWeekStarts.map((weekStartKey) => {
    const weekStart = parseDateKey(weekStartKey)
    const dayGroups = (byWeek.get(weekStartKey) ?? []).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey),
    )

    let totalMinutes = 0
    let totalDistanceKm = 0
    const types = new Set<string>()

    for (const g of dayGroups) {
      for (const ex of g.exercises) {
        totalMinutes += exerciseMinutesContribution(ex)
        totalDistanceKm += exerciseDistanceContribution(ex)
        if (ex.type) types.add(ex.type)
      }
    }

    return {
      weekIndex: weekOrdinal.get(weekStartKey)!,
      weekStartKey,
      weekRangeLabel: formatFullWeekRangeLabel(weekStart),
      monthClippedLabel: formatMonthClippedWeekLabel(
        weekStart,
        year,
        monthIndex,
      ),
      workoutDays: dayGroups.length,
      totalMinutes: Math.round(totalMinutes),
      totalDistanceKm,
      uniqueTypeCount: types.size,
      dayGroups,
    }
  })
}

export function formatExerciseLine(ex: ExerciseItem): string {
  const summary = formatExerciseSummary(ex)
  return summary ? `${ex.name} · ${summary}` : ex.name
}
