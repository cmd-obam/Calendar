import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** 일별 근무 기록 (단일 날짜 단위) */
export interface WorkLogEntry {
  /** 레거시 호환용 — 직접 입력 방식에서는 'manual' 고정 */
  templateId: string
  /** 회사명 또는 근무지 */
  title: string
  /** 급여 (기본급) */
  amount: number
  /** 인센티브 · 프로모션 수당 */
  incentive: number
  /** amount + incentive */
  finalWage: number
}

export type WorkLogsMap = Record<string, WorkLogEntry>
export type MonthlyGoalsMap = Record<string, number>

const STORAGE_KEY = 'calendar-wage-storage'
const PERSIST_VERSION = 11

function toNonNegativeNumber(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n
}

/** 급여 + 인센티브 합산 (음수는 0으로 보정) */
export function computeFinalDailyWage(
  baseAmount: number,
  incentive: number,
): number {
  return toNonNegativeNumber(baseAmount) + toNonNegativeNumber(incentive)
}

export interface WageStorePersisted {
  workLogs: WorkLogsMap
  monthlyGoals: MonthlyGoalsMap
}

export interface WageStoreState extends WageStorePersisted {
  /** 캘린더에서 현재 선택된 날짜 (YYYY-MM-DD) */
  selectedDate: string | null
}

export interface WageStoreActions {
  setSelectedDate: (date: string | null) => void

  addWorkLog: (
    date: string,
    title: string,
    amount: number,
    incentive: number,
  ) => void
  /** YYYY-MM-DD 키에 해당하는 급여 기록만 제거 (persist 동기화) */
  deleteWageRecord: (date: string) => void

  setMonthlyGoal: (yearMonth: string, amount: number) => void
}

export type WageStore = WageStoreState & WageStoreActions

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function normalizeDateKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim()
  return DATE_KEY_RE.test(key) ? key : null
}

const initialState: WageStoreState = {
  workLogs: {},
  monthlyGoals: {},
  selectedDate: null,
}

type LegacyWorkLog = {
  templateId?: unknown
  title?: unknown
  amount?: unknown
  baseWage?: unknown
  incentive?: unknown
  finalWage?: unknown
}

type LegacyPersisted = {
  templates?: unknown[]
  workLogs?: Record<string, LegacyWorkLog>
  monthlyGoals?: MonthlyGoalsMap
  monthlyGoal?: number
}

function migrateWorkLogs(raw: Record<string, LegacyWorkLog> | undefined): WorkLogsMap {
  const workLogs: WorkLogsMap = {}
  for (const [key, entry] of Object.entries(raw ?? {})) {
    if (!entry || typeof entry !== 'object') continue
    const amount = toNonNegativeNumber(entry.amount ?? entry.baseWage)
    const incentive = toNonNegativeNumber(entry.incentive)
    workLogs[key] = {
      templateId: String(entry.templateId ?? 'manual'),
      title: String(entry.title ?? '').trim(),
      amount,
      incentive,
      finalWage: amount + incentive,
    }
  }
  return workLogs
}

/** v10 이하 → v11: 템플릿 제거, workLogs·monthlyGoals 유지 */
function migrateToV11(input: unknown): WageStorePersisted {
  const empty: WageStorePersisted = {
    workLogs: {},
    monthlyGoals: {},
  }
  if (!input || typeof input !== 'object') return empty
  const p = input as LegacyPersisted

  const monthlyGoals: MonthlyGoalsMap =
    p.monthlyGoals && typeof p.monthlyGoals === 'object'
      ? { ...p.monthlyGoals }
      : {}

  return {
    workLogs: migrateWorkLogs(p.workLogs),
    monthlyGoals,
  }
}

export const useWageStore = create<WageStore>()(
  persist(
    (set) => ({
      ...initialState,

      setSelectedDate: (date) =>
        set({ selectedDate: date != null ? normalizeDateKey(date) : null }),

      addWorkLog: (date, title, amount, incentive) => {
        const amt = toNonNegativeNumber(amount)
        const inc = toNonNegativeNumber(incentive)
        const finalWage = amt + inc
        set((s) => ({
          workLogs: {
            ...s.workLogs,
            [date]: {
              templateId: 'manual',
              title: String(title ?? '').trim(),
              amount: amt,
              incentive: inc,
              finalWage,
            },
          },
        }))
      },

      deleteWageRecord: (date) =>
        set((s) => {
          const key = normalizeDateKey(date)
          if (!key || !(key in s.workLogs)) return s
          const next = { ...s.workLogs }
          delete next[key]
          return { workLogs: next }
        }),

      setMonthlyGoal: (yearMonth, amount) =>
        set((s) => {
          const next = { ...s.monthlyGoals }
          const v = toNonNegativeNumber(amount)
          if (v === 0) delete next[yearMonth]
          else next[yearMonth] = v
          return { monthlyGoals: next }
        }),
    }),
    {
      name: STORAGE_KEY,
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        workLogs: state.workLogs,
        monthlyGoals: state.monthlyGoals,
      }),
      migrate: (persisted, fromVersion) => {
        if (fromVersion < PERSIST_VERSION) {
          return migrateToV11(persisted) as WageStoreState
        }
        return persisted as WageStoreState
      },
    },
  ),
)
