import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * 사용자가 직접 만든 "실제 입금된 금액" 템플릿.
 * - title: 예) "쿠팡 주간 기본", "쿠팡 공휴일", "컬리 특근"
 * - amount: 해당 일에 실제 입금되는 금액(세후 등 모든 가산이 이미 포함된 최종액)
 */
export interface Template {
  id: string
  title: string
  amount: number
}

/** 일별 근무 기록 (단일 날짜 단위) */
export interface WorkLogEntry {
  templateId: string
  title: string
  /** 저장 시점 템플릿 입금액 스냅샷 */
  amount: number
  /** 추가 인센티브·프로모션 수당 */
  incentive: number
  /** amount + incentive */
  finalWage: number
}

export type WorkLogsMap = Record<string, WorkLogEntry>
export type MonthlyGoalsMap = Record<string, number>

const STORAGE_KEY = 'calendar-wage-storage'
const PERSIST_VERSION = 10

function createTemplateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function toNonNegativeNumber(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n
}

/**
 * 최종 일급 산식: 선택된 템플릿의 amount + additionalIncentive
 * 음수는 0으로 보정.
 */
export function computeFinalDailyWage(
  templateAmount: number,
  additionalIncentive: number,
): number {
  return toNonNegativeNumber(templateAmount) + toNonNegativeNumber(additionalIncentive)
}

export interface WageStorePersisted {
  templates: Template[]
  workLogs: WorkLogsMap
  monthlyGoals: MonthlyGoalsMap
}

export interface WageStoreState extends WageStorePersisted {
  /** 캘린더에서 현재 선택된 날짜 (YYYY-MM-DD) */
  selectedDate: string | null
  selectedTemplateId: string | null
  additionalIncentive: number
}

export interface WageStoreActions {
  /** 템플릿 생성 — title·amount 필수. 둘 다 유효해야 추가되고, 추가된 객체를 반환. */
  addTemplate: (title: string, amount: number) => Template | null
  updateTemplate: (
    id: string,
    updated: Partial<Pick<Template, 'title' | 'amount'>>,
  ) => void
  deleteTemplate: (id: string) => void

  setSelectedDate: (date: string | null) => void
  setSelectedTemplateId: (id: string | null) => void
  setAdditionalIncentive: (amount: number) => void
  /** 모달 닫을 때 초안(선택 템플릿·인센티브) 초기화 */
  resetEntryDraft: () => void

  addWorkLog: (
    date: string,
    templateId: string,
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
  templates: [],
  workLogs: {},
  monthlyGoals: {},
  selectedDate: null,
  selectedTemplateId: null,
  additionalIncentive: 0,
}

type LegacyTemplate = {
  id?: unknown
  title?: unknown
  amount?: unknown
  defaultWage?: unknown
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
  templates?: LegacyTemplate[]
  workLogs?: Record<string, LegacyWorkLog>
  monthlyGoals?: MonthlyGoalsMap
  monthlyGoal?: number
}

/** v9 이하 → v10: 시급/할증/주휴 계산 필드 제거, defaultWage→amount, baseWage→amount */
function migrateToV10(input: unknown): WageStorePersisted {
  const empty: WageStorePersisted = {
    templates: [],
    workLogs: {},
    monthlyGoals: {},
  }
  if (!input || typeof input !== 'object') return empty
  const p = input as LegacyPersisted

  const templates: Template[] = []
  for (const raw of Array.isArray(p.templates) ? p.templates : []) {
    if (!raw || typeof raw !== 'object') continue
    const id = typeof raw.id === 'string' && raw.id ? raw.id : createTemplateId()
    const title = String(raw.title ?? '').trim()
    const amount = toNonNegativeNumber(raw.amount ?? raw.defaultWage)
    if (!title) continue
    templates.push({ id, title, amount })
  }

  const workLogs: WorkLogsMap = {}
  for (const [key, raw] of Object.entries(p.workLogs ?? {})) {
    if (!raw || typeof raw !== 'object') continue
    const amount = toNonNegativeNumber(raw.amount ?? raw.baseWage)
    const incentive = toNonNegativeNumber(raw.incentive)
    workLogs[key] = {
      templateId: String(raw.templateId ?? 'manual'),
      title: String(raw.title ?? '').trim(),
      amount,
      incentive,
      finalWage: amount + incentive,
    }
  }

  const monthlyGoals: MonthlyGoalsMap =
    p.monthlyGoals && typeof p.monthlyGoals === 'object'
      ? { ...p.monthlyGoals }
      : {}

  return { templates, workLogs, monthlyGoals }
}

export const useWageStore = create<WageStore>()(
  persist(
    (set) => ({
      ...initialState,

      addTemplate: (title, amount) => {
        const trimmed = String(title ?? '').trim()
        const amt = toNonNegativeNumber(amount)
        if (!trimmed || amt <= 0) return null
        const tpl: Template = {
          id: createTemplateId(),
          title: trimmed,
          amount: amt,
        }
        set((s) => ({ templates: [...s.templates, tpl] }))
        return tpl
      },

      updateTemplate: (id, updated) =>
        set((s) => {
          const idx = s.templates.findIndex((t) => t.id === id)
          if (idx < 0) return s
          const cur = s.templates[idx]
          const nextTitle =
            updated.title !== undefined
              ? String(updated.title).trim() || cur.title
              : cur.title
          const nextAmount =
            updated.amount !== undefined
              ? toNonNegativeNumber(updated.amount)
              : cur.amount
          const next = [...s.templates]
          next[idx] = { ...cur, title: nextTitle, amount: nextAmount }
          return { templates: next }
        }),

      deleteTemplate: (id) =>
        set((s) => {
          const templates = s.templates.filter((t) => t.id !== id)
          const selectedTemplateId =
            s.selectedTemplateId === id ? null : s.selectedTemplateId
          return { templates, selectedTemplateId }
        }),

      setSelectedDate: (date) =>
        set({ selectedDate: date != null ? normalizeDateKey(date) : null }),

      setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),

      setAdditionalIncentive: (amount) =>
        set({ additionalIncentive: toNonNegativeNumber(amount) }),

      resetEntryDraft: () =>
        set({ selectedTemplateId: null, additionalIncentive: 0 }),

      addWorkLog: (date, templateId, title, amount, incentive) => {
        const amt = toNonNegativeNumber(amount)
        const inc = toNonNegativeNumber(incentive)
        const finalWage = amt + inc
        set((s) => ({
          workLogs: {
            ...s.workLogs,
            [date]: {
              templateId,
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
        templates: state.templates,
        workLogs: state.workLogs,
        monthlyGoals: state.monthlyGoals,
      }),
      migrate: (persisted, fromVersion) => {
        if (fromVersion < PERSIST_VERSION) {
          return migrateToV10(persisted) as WageStoreState
        }
        return persisted as WageStoreState
      },
    },
  ),
)
