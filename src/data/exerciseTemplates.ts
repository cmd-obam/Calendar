/**
 * 운동 템플릿 — C:\Exercise 프로젝트의 exerciseTemplates.js를 이식.
 * 새 운동 종류는 이 파일만 수정하면 된다.
 */

export type ExerciseInputType = 'time' | 'timeSets' | 'repsSets'

export type DifficultyId =
  | 'veryEasy'
  | 'easy'
  | 'moderate'
  | 'hard'
  | 'veryHard'

export interface DifficultyOption {
  id: DifficultyId
  label: string
}

export interface ExerciseTemplate {
  id: string
  name: string
  inputType: ExerciseInputType
  timeUnit?: string
  defaults: {
    minutes?: number
    distance?: number
    seconds?: number
    reps?: number
    sets?: number
  }
}

export interface ExerciseItem {
  id: string
  type: string
  name: string
  completed: boolean
  minutes?: number
  distance?: number
  seconds?: number
  reps?: number
  sets?: number
  difficulty?: DifficultyId | string
}

export interface DayExerciseRecord {
  exercises: ExerciseItem[]
  memo: string
}

export type ExerciseRecordsMap = Record<string, DayExerciseRecord>

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { id: 'veryEasy', label: '매우 쉬움' },
  { id: 'easy', label: '쉬움' },
  { id: 'moderate', label: '적당함' },
  { id: 'hard', label: '힘듦' },
  { id: 'veryHard', label: '매우 힘듦' },
]

export const exerciseTemplates: ExerciseTemplate[] = [
  {
    id: 'walking',
    name: '걷기',
    inputType: 'time',
    defaults: {},
  },
  {
    id: 'running',
    name: '런닝',
    inputType: 'time',
    defaults: {},
  },
  {
    id: 'deadHang',
    name: '데드행',
    inputType: 'timeSets',
    timeUnit: '초',
    defaults: { seconds: 5, sets: 3 },
  },
  {
    id: 'inclinePushup',
    name: '인클라인 팔굽혀펴기',
    inputType: 'repsSets',
    defaults: { reps: 3, sets: 1 },
  },
  {
    id: 'crunch',
    name: '크런치',
    inputType: 'repsSets',
    defaults: { reps: 10, sets: 2 },
  },
  {
    id: 'legRaise',
    name: '레그레이즈',
    inputType: 'repsSets',
    defaults: { reps: 8, sets: 2 },
  },
]

export function getTemplateById(typeId: string): ExerciseTemplate | null {
  return exerciseTemplates.find((t) => t.id === typeId) ?? null
}

/** 총 분 → "1시간 20분" / "40분" / "2시간" */
export function formatDuration(totalMinutes: number): string {
  const total = Math.round(Number(totalMinutes) || 0)
  if (total <= 0) return '0분'

  const hours = Math.floor(total / 60)
  const minutes = total % 60

  if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`
  if (hours > 0) return `${hours}시간`
  return `${minutes}분`
}

export function splitDuration(totalMinutes: number): {
  hours: number
  minutes: number
} {
  const total = Math.max(0, Math.round(Number(totalMinutes) || 0))
  return {
    hours: Math.floor(total / 60),
    minutes: total % 60,
  }
}

export function toTotalMinutes(hours: number, minutes: number): number {
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0)
}

export function formatExerciseSummary(exercise: ExerciseItem): string {
  const template = getTemplateById(exercise.type)
  if (!template) return ''

  if (template.inputType === 'time') {
    let text = formatDuration(exercise.minutes ?? 0)
    if (exercise.distance != null && Number(exercise.distance) > 0) {
      text += ` / ${exercise.distance}km`
    }
    return text
  }

  if (template.inputType === 'timeSets') {
    return `${exercise.seconds}${template.timeUnit} × ${exercise.sets}세트`
  }

  if (template.inputType === 'repsSets') {
    return `${exercise.reps}회 × ${exercise.sets}세트`
  }

  return ''
}

export interface ExerciseTypeAggregate {
  type: string
  name: string
  inputType: ExerciseInputType
  count: number
  minutes: number
  seconds: number
  reps: number
  sets: number
  distance: number
}

export function aggregateByType(
  exercises: ExerciseItem[],
): ExerciseTypeAggregate[] {
  const map: Record<string, ExerciseTypeAggregate> = {}

  for (const exercise of exercises) {
    const template = getTemplateById(exercise.type)
    if (!template) continue

    if (!map[exercise.type]) {
      map[exercise.type] = {
        type: exercise.type,
        name: exercise.name,
        inputType: template.inputType,
        count: 0,
        minutes: 0,
        seconds: 0,
        reps: 0,
        sets: 0,
        distance: 0,
      }
    }

    const agg = map[exercise.type]
    agg.count += 1

    if (template.inputType === 'time') {
      agg.minutes += Number(exercise.minutes) || 0
      if (exercise.distance != null && String(exercise.distance) !== '') {
        agg.distance += Number(exercise.distance) || 0
      }
    } else if (template.inputType === 'timeSets') {
      agg.seconds += Number(exercise.seconds) || 0
      agg.sets += Number(exercise.sets) || 0
    } else if (template.inputType === 'repsSets') {
      agg.reps += Number(exercise.reps) || 0
      agg.sets += Number(exercise.sets) || 0
    }
  }

  return Object.values(map)
}

export function formatAggregate(agg: ExerciseTypeAggregate): string {
  if (agg.inputType === 'time') {
    let text = formatDuration(agg.minutes)
    if (agg.distance > 0) {
      text += ` / ${agg.distance.toFixed(1)}km`
    }
    return text
  }
  if (agg.inputType === 'timeSets') {
    return `총 ${agg.seconds}초 / ${agg.sets}세트`
  }
  if (agg.inputType === 'repsSets') {
    return `총 ${agg.reps}회 / ${agg.sets}세트`
  }
  return ''
}

/** 이번 달 운동한 날 수 + 총 거리(있을 때만) */
export function calculateMonthlyExerciseSummary(
  records: ExerciseRecordsMap,
  year: number,
  monthIndex: number,
): { workoutDays: number; totalDistanceKm: number } {
  const ym = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  let workoutDays = 0
  let totalDistanceKm = 0

  for (const [key, day] of Object.entries(records)) {
    if (!key.startsWith(ym)) continue
    if (!day?.exercises?.length) continue
    workoutDays += 1
    for (const ex of day.exercises) {
      if (ex.distance != null && String(ex.distance) !== '') {
        totalDistanceKm += Number(ex.distance) || 0
      }
    }
  }

  return { workoutDays, totalDistanceKm }
}
