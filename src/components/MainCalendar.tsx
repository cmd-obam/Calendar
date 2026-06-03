import styled from '@emotion/styled'
import { useCallback, useMemo, useState } from 'react'
import CalendarEntryModal from './CalendarEntryModal'
import MonthlyReportModal from './MonthlyReportModal'
import { sumMonthlyTotalIncome } from '../lib/monthlySettlement'
import { useWageStore } from '../store/useWageStore'
import { getHolidayName } from '../utils/holidays'

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

const AppFrame = styled.div`
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
  min-height: 100dvh;
  min-height: 100svh;
  padding: 1rem 0.875rem calc(1rem + env(safe-area-inset-bottom, 0));
  padding-top: calc(1rem + env(safe-area-inset-top, 0));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
  margin-bottom: 0.85rem;
`

const DetailButton = styled.button`
  flex-shrink: 0;
  margin-top: 0.15rem;
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

  &:active {
    transform: scale(0.97);
  }
`

const StatBlock = styled.div`
  flex: 1;
  min-width: 0;
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

const GoalRow = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
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
  margin-top: 0.35rem;
`

const CalendarSection = styled.div`
  width: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 0 0.65rem 1rem;
  box-sizing: border-box;
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
  min-height: 4.5rem;
  padding: 0.28rem 0.15rem 0.32rem;
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
  gap: 0.12rem;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  flex: 1;
`

const DayNum = styled.span<{ $isHoliday?: boolean }>`
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.1;
  color: ${({ $isHoliday }) =>
    $isHoliday ? 'var(--cal-sun, #ef4444)' : 'inherit'};
`

const HolidayLabel = styled.span`
  display: block;
  min-width: 0;
  width: 100%;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.15;
  color: var(--cal-sun, #ef4444);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LogBadge = styled.div`
  min-width: 0;
  width: 100%;
  margin-top: auto;
  padding: 0.18rem 0.28rem;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.22);
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  overflow: hidden;
  box-sizing: border-box;
`

const LogTitle = styled.span`
  min-width: 0;
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--cal-text, #111827);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
`

const LogWage = styled.span`
  font-size: 0.55rem;
  font-weight: 900;
  color: var(--cal-accent-strong, #4338ca);
  letter-spacing: -0.02em;
`

export default function MainCalendar() {
  const workLogs = useWageStore((s) => s.workLogs)
  const monthlyGoals = useWageStore((s) => s.monthlyGoals)
  const selectedDate = useWageStore((s) => s.selectedDate)
  const setSelectedDate = useWageStore((s) => s.setSelectedDate)
  const setMonthlyGoal = useWageStore((s) => s.setMonthlyGoal)

  const [cursor, setCursor] = useState(() => new Date())
  const [reportOpen, setReportOpen] = useState(false)

  const year = cursor.getFullYear()
  const monthIndex = cursor.getMonth()
  const yearMonthKey = `${year}-${pad2(monthIndex + 1)}`
  const monthlyGoal = monthlyGoals[yearMonthKey] ?? 0

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

  const progressPct = useMemo(() => {
    if (monthlyGoal <= 0) return 0
    return Math.min(100, (monthTotal / monthlyGoal) * 100)
  }, [monthTotal, monthlyGoal])

  const today = useMemo(() => new Date(), []) // 렌더 시점의 “오늘” — 필요 시 앱 레벨에서 갱신 가능
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
      const n = Number(raw.replace(/,/g, ''))
      setMonthlyGoal(yearMonthKey, Number.isFinite(n) ? n : 0)
    },
    [setMonthlyGoal, yearMonthKey],
  )

  return (
    <AppFrame>
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

          <StatBlockRow>
            <StatBlock>
              <StatLabel>이번 달 총 수입</StatLabel>
              <StatValue>{formatKRW(monthTotal)}</StatValue>
            </StatBlock>
            <DetailButton
              type="button"
              onClick={() => setReportOpen(true)}
            >
              상세 보기
            </DetailButton>
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
            <ProgressTrack>
              <ProgressFill pct={progressPct} />
            </ProgressTrack>
            <ProgressMeta>
              <span>
                달성률{' '}
                {monthlyGoal > 0
                  ? `${progressPct.toFixed(1)}%`
                  : '목표 미설정'}
              </span>
              <span>
                {monthlyGoal > 0
                  ? `${formatKRW(monthTotal)} / ${formatKRW(monthlyGoal)}`
                  : '—'}
              </span>
            </ProgressMeta>
          </GoalRow>
        </Dashboard>
      </Card>

      <Card>
        <CalendarSection>
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
                  muted={muted}
                  disabled={muted}
                  isSelected={isSelected}
                  isToday={isToday}
                  sunSat={muted ? undefined : sunSat}
                  onClick={() => handleDateClick(day)}
                  aria-label={
                    dateKey
                      ? `${dateKey}${holidayName ? `, ${holidayName}` : ''}${log ? `, ${log.title}` : ''}`
                      : '빈 칸'
                  }
                >
                  {!muted && day != null && (
                    <DayCellBody>
                      <DayNum $isHoliday={isHoliday}>{day}</DayNum>
                      {holidayName && (
                        <HolidayLabel title={holidayName}>
                          {holidayName}
                        </HolidayLabel>
                      )}
                      {log && (
                        <LogBadge>
                          <LogTitle>{log.title}</LogTitle>
                          <LogWage>{formatKRW(log.finalWage)}</LogWage>
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
    </AppFrame>
  )
}
