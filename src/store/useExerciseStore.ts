import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import {
  getTemplateById,
  type DayExerciseRecord,
  type DifficultyId,
  type ExerciseItem,
  type ExerciseRecordsMap,
} from '../data/exerciseTemplates'

/** Exercise 앱과 동일 키 — 같은 브라우저의 기존 운동 기록을 그대로 이어서 씀 */
const STORAGE_KEY = 'exercise-records-v1'

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emptyDay(): DayExerciseRecord {
  return { exercises: [], memo: '' }
}

export type ExercisePayload = {
  type: string
  difficulty?: DifficultyId | string
  minutes?: number
  distance?: number
  seconds?: number
  reps?: number
  sets?: number
}

interface ExerciseStoreState {
  records: ExerciseRecordsMap
}

interface ExerciseStoreActions {
  getDay: (dateKey: string) => DayExerciseRecord
  addExercise: (dateKey: string, payload: ExercisePayload) => void
  updateExercise: (
    dateKey: string,
    exerciseId: string,
    updates: Partial<ExerciseItem> & ExercisePayload,
  ) => void
  deleteExercise: (dateKey: string, exerciseId: string) => void
  toggleExerciseCompleted: (dateKey: string, exerciseId: string) => void
  updateMemo: (dateKey: string, memo: string) => void
  clearDay: (dateKey: string) => void
}

export type ExerciseStore = ExerciseStoreState & ExerciseStoreActions

function normalizeRecords(raw: unknown): ExerciseRecordsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ExerciseRecordsMap = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== 'object') {
      continue
    }
    const day = value as { exercises?: unknown; memo?: unknown }
    const exercises = Array.isArray(day.exercises)
      ? (day.exercises as ExerciseItem[])
      : []
    out[key] = {
      exercises,
      memo: typeof day.memo === 'string' ? day.memo : '',
    }
  }
  return out
}

/**
 * Exercise 앱은 localStorage에 날짜맵 JSON을 그대로 저장한다.
 * Zustand persist 래퍼와 호환되도록 읽기/쓰기 시 변환한다.
 */
const exerciseCompatStorage: StateStorage = {
  getItem: (name) => {
    const raw = localStorage.getItem(name)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as unknown
      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        'state' in (parsed as object)
      ) {
        return raw
      }
      return JSON.stringify({
        state: { records: normalizeRecords(parsed) },
        version: 0,
      })
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      const parsed = JSON.parse(value) as {
        state?: { records?: unknown }
      }
      const records = normalizeRecords(parsed.state?.records ?? {})
      localStorage.setItem(name, JSON.stringify(records))
    } catch {
      localStorage.setItem(name, value)
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
}

export const useExerciseStore = create<ExerciseStore>()(
  persist(
    (set, get) => ({
      records: {},

      getDay: (dateKey) => get().records[dateKey] ?? emptyDay(),

      addExercise: (dateKey, payload) => {
        const template = getTemplateById(payload.type)
        if (!template) return

        const newExercise: ExerciseItem = {
          id: createId(),
          completed: false,
          ...payload,
          type: template.id,
          name: template.name,
        }

        set((s) => {
          const day = s.records[dateKey] ?? emptyDay()
          return {
            records: {
              ...s.records,
              [dateKey]: {
                ...day,
                exercises: [...day.exercises, newExercise],
              },
            },
          }
        })
      },

      updateExercise: (dateKey, exerciseId, updates) => {
        set((s) => {
          const day = s.records[dateKey]
          if (!day) return s
          return {
            records: {
              ...s.records,
              [dateKey]: {
                ...day,
                exercises: day.exercises.map((ex) =>
                  ex.id === exerciseId ? { ...ex, ...updates } : ex,
                ),
              },
            },
          }
        })
      },

      deleteExercise: (dateKey, exerciseId) => {
        set((s) => {
          const day = s.records[dateKey]
          if (!day) return s
          const exercises = day.exercises.filter((ex) => ex.id !== exerciseId)
          const next = { ...s.records }
          if (exercises.length === 0 && !day.memo.trim()) {
            delete next[dateKey]
          } else {
            next[dateKey] = { ...day, exercises }
          }
          return { records: next }
        })
      },

      toggleExerciseCompleted: (dateKey, exerciseId) => {
        set((s) => {
          const day = s.records[dateKey]
          if (!day) return s
          return {
            records: {
              ...s.records,
              [dateKey]: {
                ...day,
                exercises: day.exercises.map((ex) =>
                  ex.id === exerciseId
                    ? { ...ex, completed: !ex.completed }
                    : ex,
                ),
              },
            },
          }
        })
      },

      updateMemo: (dateKey, memo) => {
        set((s) => {
          const day = s.records[dateKey] ?? emptyDay()
          const next = { ...s.records }
          if (day.exercises.length === 0 && !memo.trim()) {
            delete next[dateKey]
            return { records: next }
          }
          next[dateKey] = { ...day, memo }
          return { records: next }
        })
      },

      clearDay: (dateKey) => {
        set((s) => {
          if (!(dateKey in s.records)) return s
          const next = { ...s.records }
          delete next[dateKey]
          return { records: next }
        })
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => exerciseCompatStorage),
      partialize: (state) => ({ records: state.records }),
    },
  ),
)
