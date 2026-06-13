import styled from '@emotion/styled'
import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import CalendarEntryModal from './CalendarEntryModal'
import ExpenseHistory from './ExpenseHistory'
import MonthlyReportModal from './MonthlyReportModal'
import SettingsModal from './SettingsModal'
import TopAppBar from './TopAppBar'
import { sumMonthlyTotalIncome } from '../lib/monthlySettlement'
import {
  calcExpenseRatioPercent,
  calcIncomeAchievementRatio,
  calcMonthlyTargetSavings,
  calcSavingsProgressRatio,
  clampGaugePercent,
  formatRatioOneDecimal,
  parseWonInput,
  toWonInteger,
} from '../lib/financeMetrics'
import { useWageStore } from '../store/useWageStore'
import { getHolidayName } from '../utils/holidays'
import type { ExpenseItem } from '../lib/expenseHistoryUtils'
import { sumMonthlyExpenses } from '../lib/expenseHistoryUtils'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 로컬 기준 YYYY-MM-DD */
function toDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

function formatKRW(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`
}

function formatKRWAmount(n: number): string {
  return n.toLocaleString('ko-KR')
}


const AppFrame = styled.div`
  width: 100%;
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-sizing: border-box;
`

const Card = styled.div`
  background: var(--cal-surface, #ffffff);
  color: var(--cal-text, #111827);
  border-radius: 16px;
  box-shadow:
    0 10px 40px -12px rgba(15, 23, 42, 0.18),
    0 4px 12px -4px rgba(15, 23, 42, 0.08);
  border: 1px solid var(--cal-border, rgba(15, 23, 42, 0.06));
  overflow: hidden;
`

const Dashboard = styled.div`
  padding: 1rem 1.1rem 1.15rem;
`

const MonthNav = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
`

const MonthTitle = styled.h2`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  flex: 1;
  text-align: center;
`

const NavButton = styled.button`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: var(--cal-muted, #f3f4f6);
  color: var(--cal-text, #111827);
  font-size: 1.1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.15s ease, transform 0.1s ease;

  &:active {
    transform: scale(0.96);
    background: var(--cal-muted-press, #e5e7eb);
  }
`

const StatBlockRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
  width: 100%;
`

const ActionButtonCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 4.85rem;
  max-width: 5.25rem;
  align-self: stretch;
`

const DetailButton = styled.button`
  flex: 1;
  width: 100%;
  min-height: 0;
  padding: 0.4rem 0.65rem;
  font-size: 0.68rem;
  font-weight: 800;
  border: none;
  border-radius: 10px;
  background: var(--cal-accent-strong, #6366f1);
  color: #fff;
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    transform: scale(0.97);
  }
`

const StatBlock = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: linear-gradient(
    135deg,
    var(--cal-accent-soft, #eef2ff) 0%,
    var(--cal-surface, #fff) 100%
  );
  border-radius: 12px;
  padding: 0.9rem 1rem;
  border: 1px solid var(--cal-border, rgba(99, 102, 241, 0.12));
`

const StatLabel = styled.p`
  margin: 0 0 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cal-text-dim, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const StatValue = styled.p`
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--cal-accent-strong, #4338ca);
`

const GoalRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 0.15rem;
`

const GoalTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`

const GoalLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--cal-text-dim, #6b7280);
`

const GoalInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
`

const GoalInput = styled.input`
  width: 7.5rem;
  max-width: 45vw;
  padding: 0.45rem 0.55rem;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--cal-border, #e5e7eb);
  background: var(--cal-surface, #fff);
  color: inherit;
  text-align: right;

  &:focus {
    outline: 2px solid var(--cal-accent-strong, #6366f1);
    outline-offset: 1px;
  }
`

const ProgressTrack = styled.div`
  height: 10px;
  border-radius: 999px;
  background: var(--cal-muted, #e5e7eb);
  overflow: hidden;
`

const ProgressFill = styled.div<{ pct: number }>`
  height: 100%;
  width: ${({ pct }) => pct}%;
  max-width: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--cal-accent-strong, #6366f1) 0%,
    var(--cal-accent-mid, #818cf8) 100%
  );
  transition: width 0.35s ease;
`

const ProgressMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--cal-text-dim, #6b7280);
`

const FinanceGaugeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--cal-border, #f3f4f6);
`

const GaugeBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const GaugeLabel = styled.p`
  margin: 0;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--cal-text-dim, #6b7280);
  word-break: keep-all;
`

const CalendarSection = styled.div`
  width: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 0.65rem 0.65rem 1rem;
  box-sizing: border-box;
`

const CalendarToolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.45rem;
`

const AmountToggleBtn = styled.button`
  padding: 0.38rem 0.7rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  border: 1px solid var(--cal-border, #e5e7eb);
  border-radius: 10px;
  background: var(--cal-muted, #f9fafb);
  color: var(--cal-text-dim, #6b7280);
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;

  &:active {
    transform: scale(0.97);
    background: var(--cal-muted-press, #e5e7eb);
  }
`

const WeekHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  width: 100%;
  min-width: 0;
  gap: 2px;
  margin-bottom: 0.35rem;
`

const WeekHeadCell = styled.div<{ sunSat?: 'sun' | 'sat' }>`
  min-width: 0;
  text-align: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: ${({ sunSat }) =>
    sunSat === 'sun'
      ? 'var(--cal-sun, #dc2626)'
      : sunSat === 'sat'
        ? 'var(--cal-sat, #2563eb)'
        : 'var(--cal-text-dim, #6b7280)'};
  padding: 0.35rem 0;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  width: 100%;
  min-width: 0;
  gap: 3px;
`

const DayCell = styled.button<{
  isSelected: boolean
  isToday: boolean
  muted: boolean
  sunSat?: 'sun' | 'sat'
}>`
  position: relative;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  height: 5rem;
  max-height: 5rem;
  min-height: 5rem;
  padding: 0.26rem 0.125rem 0.3rem 0.125rem;
  border: none;
  border-radius: 10px;
  overflow: hidden;
  box-sizing: border-box;
  background: ${({ isSelected, isToday }) =>
    isSelected
      ? 'var(--cal-cell-selected, #e0e7ff)'
      : isToday
        ? 'var(--cal-cell-today, #f5f3ff)'
        : 'var(--cal-cell, #f9fafb)'};
  box-shadow: ${({ isSelected }) =>
    isSelected
      ? '0 0 0 2px var(--cal-accent-strong, #6366f1)'
      : 'inset 0 0 0 1px var(--cal-cell-edge, rgba(15, 23, 42, 0.06))'};
  color: ${({ muted, sunSat }) =>
    muted
      ? 'transparent'
      : sunSat === 'sun'
        ? 'var(--cal-sun, #dc2626)'
        : sunSat === 'sat'
          ? 'var(--cal-sat, #2563eb)'
          : 'var(--cal-text, #111827)'};
  cursor: ${({ muted }) => (muted ? 'default' : 'pointer')};
  touch-action: manipulation;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  text-align: left;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;

  &:active {
    transform: ${({ muted }) => (muted ? 'none' : 'scale(0.97)')};
  }
`

const DayCellBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.125rem;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  flex: 1;
`

const DayNum = styled.span<{ $isHoliday?: boolean }>`
  flex-shrink: 0;
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.1;
  color: ${({ $isHoliday }) =>
    $isHoliday ? 'var(--cal-sun, #ef4444)' : 'inherit'};
`

const LogBadge = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
  padding: 0.25rem 0.125rem;
  border-radius: 5px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.22);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.0625rem;
  overflow: hidden;
  box-sizing: border-box;
`

const LogTitleWrap = styled.div`
  min-width: 0;
  width: 100%;
  overflow: hidden;
`

const LogTitle = styled.span`
  display: block;
  min-width: 0;
  width: 100%;
  font-size: 0.5625rem;
  font-weight: 700;
  line-height: 1.05;
  color: var(--cal-text, #111827);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LogWageWrap = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: visible;
  margin-top: auto;
  flex-shrink: 0;
`

const LogWage = styled.span`
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  max-width: 100%;
  white-space: nowrap;
  font-size: 8px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
  color: var(--cal-accent-strong, #4338ca);
`

const LogWageUnit = styled.span`
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  line-height: inherit;
`

export interface MainCalendarProps {
  expenses: ExpenseItem[]
  setExpenses: Dispatch<SetStateAction<ExpenseItem[]>>
}

export default function MainCalendar({
  expenses,
  setExpenses,
}: MainCalendarProps) {
  const workLogs = useWageStore((s) => s.workLogs)
  const monthlyGoals = useWageStore((s) => s.monthlyGoals)
  const selectedDate = useWageStore((s) => s.selectedDate)
  const setSelectedDate = useWageStore((s) => s.setSelectedDate)
  const setMonthlyGoal = useWageStore((s) => s.setMonthlyGoal)

  const [cursor, setCursor] = useState(() => new Date())
  const [reportOpen, setReportOpen] = useState(false)
  const [showAmounts, setShowAmounts] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [expenseHistoryOpen, setExpenseHistoryOpen] = useState(false)

  const [currentSavings] = useState(0)
  const [savingsTargetAmount] = useState(0)
  const [savingsTargetMonths] = useState(0)

  const year = cursor.getFullYear()
  const monthIndex = cursor.getMonth()
  const yearMonthKey = `${year}-${pad2(monthIndex + 1)}`
  const monthlyGoal = useMemo(
    () => toWonInteger(monthlyGoals[yearMonthKey] ?? 0),
    [monthlyGoals, yearMonthKey],
  )

  const monthLabel = useMemo(
    () =>
      cursor.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
      }),
    [cursor],
  )

  const monthTotal = useMemo(
    () => sumMonthlyTotalIncome(workLogs, year, monthIndex),
    [workLogs, year, monthIndex],
  )

  const totalIncome = useMemo(() => toWonInteger(monthTotal), [monthTotal])

  const incomeAchievementRatio = useMemo(
    () => calcIncomeAchievementRatio(totalIncome, monthlyGoal),
    [totalIncome, monthlyGoal],
  )
  const incomeAchievementLabel = useMemo(
    () => formatRatioOneDecimal(incomeAchievementRatio),
    [incomeAchievementRatio],
  )
  const incomeAchievementBarWidth = useMemo(
    () => clampGaugePercent(incomeAchievementRatio),
    [incomeAchievementRatio],
  )

  const totalExpenseWon = useMemo(
    () => sumMonthlyExpenses(expenses, year, monthIndex),
    [expenses, year, monthIndex],
  )
  const currentSavingsWon = useMemo(
    () => toWonInteger(currentSavings),
    [currentSavings],
  )
  const savingsTargetAmountWon = useMemo(
    () => toWonInteger(savingsTargetAmount),
    [savingsTargetAmount],
  )
  const savingsTargetMonthsSafe = useMemo(() => {
    const months = Math.floor(savingsTargetMonths)
    return Number.isFinite(months) && months > 0 ? months : 0
  }, [savingsTargetMonths])

  const expenseRatio = useMemo(
    () => calcExpenseRatioPercent(totalExpenseWon, totalIncome),
    [totalExpenseWon, totalIncome],
  )
  const expenseRatioLabel = useMemo(
    () => formatRatioOneDecimal(expenseRatio),
    [expenseRatio],
  )
  const expenseBarWidth = useMemo(
    () => clampGaugePercent(expenseRatio),
    [expenseRatio],
  )

  const monthlyTargetSavings = useMemo(
    () =>
      calcMonthlyTargetSavings(
        savingsTargetAmountWon,
        savingsTargetMonthsSafe,
      ),
    [savingsTargetAmountWon, savingsTargetMonthsSafe],
  )
  const savingsProgressRatio = useMemo(
    () =>
      calcSavingsProgressRatio(currentSavingsWon, monthlyTargetSavings),
    [currentSavingsWon, monthlyTargetSavings],
  )
  const savingsProgressLabel = useMemo(
    () => formatRatioOneDecimal(savingsProgressRatio),
    [savingsProgressRatio],
  )
  const savingsBarWidth = useMemo(
    () => clampGaugePercent(savingsProgressRatio),
    [savingsProgressRatio],
  )

  const today = useMemo(() => new Date(), [])
  const todayKey = toDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  const gridCells = useMemo(() => {
    const first = new Date(year, monthIndex, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const cells: Array<number | null> = [
      ...Array.from({ length: startPad }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, monthIndex])

  const goPrevMonth = useCallback(() => {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }, [])

  const goNextMonth = useCallback(() => {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }, [])

  const handleDateClick = useCallback(
    (day: number | null) => {
      if (day == null) return
      const key = toDateKey(year, monthIndex, day)
      console.log('[MainCalendar] date click →', key)
      setSelectedDate(key)
    },
    [year, monthIndex, setSelectedDate],
  )

  const handleGoalChange = useCallback(
    (raw: string) => {
      setMonthlyGoal(yearMonthKey, parseWonInput(raw))
    },
    [setMonthlyGoal, yearMonthKey],
  )

  if (expenseHistoryOpen) {
    return (
      <AppFrame>
        <ExpenseHistory
          expenses={expenses}
          setExpenses={setExpenses}
          onBack={() => setExpenseHistoryOpen(false)}
        />
      </AppFrame>
    )
  }

  return (
    <AppFrame>
      <TopAppBar onOpenSettings={() => setIsSettingsOpen(true)} />

      <Card>
        <Dashboard>
          <MonthNav>
            <NavButton
              type="button"
              aria-label="이전 달"
              onClick={goPrevMonth}
            >
              ‹
            </NavButton>
            <MonthTitle>{monthLabel}</MonthTitle>
            <NavButton
              type="button"
              aria-label="다음 달"
              onClick={goNextMonth}
            >
              ›
            </NavButton>
          </MonthNav>

          <StatBlockRow className="flex w-full items-stretch gap-x-3">
            <StatBlock className="flex min-h-0 flex-1 flex-col justify-center">
              <StatLabel>이번 달 총 수입</StatLabel>
              <StatValue>{formatKRW(monthTotal)}</StatValue>
            </StatBlock>
            <ActionButtonCol className="flex flex-1 flex-col gap-y-2 self-stretch">
              <DetailButton
                type="button"
                className="flex-1"
                onClick={() => setReportOpen(true)}
              >
                상세 보기
              </DetailButton>
              <DetailButton
                type="button"
                className="flex-1"
                onClick={() => setExpenseHistoryOpen(true)}
              >
                소비 내역
              </DetailButton>
              <DetailButton
                type="button"
                className="flex-1"
                onClick={() =>
                  window.alert('목표 저축 설정 모달은 준비 중입니다.')
                }
              >
                목표 저축
              </DetailButton>
            </ActionButtonCol>
          </StatBlockRow>

          <GoalRow>
            <GoalTop>
              <GoalLabel>월별 목표</GoalLabel>
              <GoalInputWrap>
                <GoalInput
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="월 목표 금액"
                  value={monthlyGoal === 0 ? '' : String(monthlyGoal)}
                  placeholder="0"
                  onChange={(e) => handleGoalChange(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>원</span>
              </GoalInputWrap>
            </GoalTop>
            <ProgressTrack
              role="progressbar"
              aria-valuenow={incomeAchievementBarWidth}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`수입 달성률 ${incomeAchievementLabel}%`}
            >
              <ProgressFill pct={incomeAchievementBarWidth} />
            </ProgressTrack>
            <ProgressMeta>
              <span>
                달성률{' '}
                {monthlyGoal > 0
                  ? `${incomeAchievementLabel}%`
                  : '목표 미설정'}
              </span>
              <span>
                {monthlyGoal > 0
                  ? `${formatKRW(totalIncome)} / ${formatKRW(monthlyGoal)}`
                  : '—'}
              </span>
            </ProgressMeta>
          </GoalRow>

          <FinanceGaugeSection>
            <GaugeBlock>
              <GaugeLabel>
                지출 비율: {formatKRW(totalExpenseWon)} /{' '}
                {formatKRW(totalIncome)} ({expenseRatioLabel}%)
              </GaugeLabel>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={expenseBarWidth}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`지출 비율 ${expenseRatioLabel}%`}
              >
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-500 ease-out"
                  style={{ width: `${expenseBarWidth}%` }}
                />
              </div>
            </GaugeBlock>

            <GaugeBlock>
              <GaugeLabel>
                저축 달성률: {formatKRW(currentSavingsWon)} /{' '}
                {formatKRW(monthlyTargetSavings)} (
                {monthlyTargetSavings > 0
                  ? `${savingsProgressLabel}%`
                  : '0.0%'}
                )
              </GaugeLabel>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={savingsBarWidth}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`저축 달성률 ${savingsProgressLabel}%`}
              >
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${savingsBarWidth}%` }}
                />
              </div>
            </GaugeBlock>
          </FinanceGaugeSection>
        </Dashboard>
      </Card>

      <Card>
        <CalendarSection>
          <CalendarToolbar>
            <AmountToggleBtn
              type="button"
              aria-pressed={showAmounts}
              onClick={() => setShowAmounts((v) => !v)}
            >
              {showAmounts ? '금액 숨기기' : '금액 보기'}
            </AmountToggleBtn>
          </CalendarToolbar>
          <WeekHeader>
            {WEEKDAYS.map((w, idx) => (
              <WeekHeadCell
                key={w}
                sunSat={idx === 0 ? 'sun' : idx === 6 ? 'sat' : undefined}
              >
                {w}
              </WeekHeadCell>
            ))}
          </WeekHeader>

          <Grid>
            {gridCells.map((day, idx) => {
              const muted = day == null
              const dateKey =
                day != null ? toDateKey(year, monthIndex, day) : null
              const log = dateKey ? workLogs[dateKey] : undefined
              const jsDay = day != null ? new Date(year, monthIndex, day) : null
              const dow = jsDay?.getDay()
              const sunSat =
                dow === 0 ? 'sun' : dow === 6 ? 'sat' : undefined
              const isToday = dateKey === todayKey
              const isSelected =
                dateKey != null && selectedDate === dateKey
              const holidayName =
                dateKey != null ? getHolidayName(dateKey) : undefined
              const isHoliday = holidayName != null

              return (
                <DayCell
                  key={idx}
                  type="button"
                  className="h-20 overflow-hidden px-0.5"
                  muted={muted}
                  disabled={muted}
                  isSelected={isSelected}
                  isToday={isToday}
                  sunSat={muted ? undefined : sunSat}
                  onClick={() => handleDateClick(day)}
                  aria-label={
                    dateKey
                      ? `${dateKey}${holidayName ? `, ${holidayName}` : ''}${log ? `, ${log.title}${showAmounts ? `, ${formatKRW(log.finalWage)}` : ', 금액 숨김'}` : ''}`
                      : '빈 칸'
                  }
                >
                  {!muted && day != null && (
                    <DayCellBody className="flex flex-col gap-y-0.5">
                      <DayNum
                        className={isHoliday ? 'text-red-500' : undefined}
                        $isHoliday={isHoliday}
                      >
                        {day}
                      </DayNum>
                      {log && (
                        <LogBadge
                          className={`flex flex-1 flex-col px-0.5 py-1 ${showAmounts ? 'justify-between' : 'justify-center'}`}
                        >
                          <LogTitleWrap>
                            <LogTitle className="leading-tight" title={log.title}>
                              {log.title}
                            </LogTitle>
                          </LogTitleWrap>
                          {showAmounts ? (
                            <LogWageWrap className="flex w-full flex-col items-center justify-center overflow-visible">
                              <LogWage
                                className="flex items-baseline gap-x-[2px] whitespace-nowrap text-[8px] tracking-[-0.05em]"
                                title={formatKRW(log.finalWage)}
                              >
                                <span>{formatKRWAmount(log.finalWage)}</span>
                                <LogWageUnit>원</LogWageUnit>
                              </LogWage>
                            </LogWageWrap>
                          ) : null}
                        </LogBadge>
                      )}
                    </DayCellBody>
                  )}
                </DayCell>
              )
            })}
          </Grid>
        </CalendarSection>
      </Card>

      <CalendarEntryModal
        open={selectedDate != null}
        onClose={() => setSelectedDate(null)}
      />

      <MonthlyReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        year={year}
        monthIndex={monthIndex}
        workLogs={workLogs}
      />

      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </AppFrame>
  )
}
