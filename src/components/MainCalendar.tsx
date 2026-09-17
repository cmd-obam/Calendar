import styled from '@emotion/styled'
import { useCallback, useMemo, useState } from 'react'
import CalendarEntryModal from './CalendarEntryModal'
import MonthlyReportModal from './MonthlyReportModal'
import SettingsModal from './SettingsModal'
import TopAppBar from './TopAppBar'
import BottomNavigation, {
  type BottomNavTab,
} from './layout/BottomNavigation'
import { sumMonthlyTotalIncome } from '../lib/monthlySettlement'
import { useWageStore } from '../store/useWageStore'
import { useExerciseStore } from '../store/useExerciseStore'
import { calculateMonthlyExerciseSummary } from '../data/exerciseTemplates'
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

function formatKRWAmount(n: number): string {
  return n.toLocaleString('ko-KR')
}

type DayRecordKind = 'overtime' | 'income' | 'exercise' | 'memo'

const DAY_RECORD_PRIORITY: DayRecordKind[] = [
  'overtime',
  'income',
  'exercise',
  'memo',
]

const DAY_RECORD_ICON: Record<DayRecordKind, string> = {
  overtime: '★',
  income: '💰',
  exercise: '🏃',
  memo: '📝',
}

const DAY_RECORD_LABEL: Record<DayRecordKind, string> = {
  overtime: '연장근무',
  income: '수입',
  exercise: '운동',
  memo: '메모',
}

function buildDayRecordSummary(flags: {
  overtime: boolean
  income: boolean
  exercise: boolean
  memo: boolean
}): { visible: DayRecordKind[]; hiddenCount: number } {
  const kinds = DAY_RECORD_PRIORITY.filter((kind) => flags[kind])
  return {
    visible: kinds.slice(0, 2),
    hiddenCount: Math.max(0, kinds.length - 2),
  }
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

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  gap: 0;
  margin-bottom: 0.75rem;
  border-radius: 16px;
  border: 1px solid var(--cal-border, rgba(99, 102, 241, 0.14));
  background: linear-gradient(
    135deg,
    var(--cal-accent-soft, #eef2ff) 0%,
    var(--cal-surface, #fff) 72%
  );
  overflow: hidden;
`

const MetricBlock = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.9rem 0.85rem;
`

const MetricDivider = styled.div`
  width: 1px;
  align-self: stretch;
  margin: 0.7rem 0;
  background: rgba(15, 23, 42, 0.1);
`

const MetricLabel = styled.p`
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--cal-text-dim, #6b7280);
  letter-spacing: -0.01em;
  white-space: nowrap;
`

const MetricValue = styled.p<{ $accent?: boolean }>`
  margin: 0;
  font-size: ${({ $accent }) => ($accent ? '1.2rem' : '1.15rem')};
  font-weight: 900;
  letter-spacing: -0.03em;
  color: ${({ $accent }) =>
    $accent ? 'var(--cal-accent-strong, #4338ca)' : '#111827'};
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MetricMeta = styled.span`
  font-size: 0.7rem;
  font-weight: 800;
  color: #4f46e5;
`

const QuickMenu = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-bottom: 0;
`

const QuickMenuBtn = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  min-height: 4.35rem;
  padding: 0.65rem 0.35rem;
  border: none;
  border-radius: 14px;
  background: var(--cal-accent-strong, #6366f1);
  color: #fff;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.28);

  &:active {
    transform: scale(0.97);
  }
`

const QuickIcon = styled.span`
  font-size: 1.15rem;
  line-height: 1;
`

const QuickLabel = styled.span`
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
`

const DayMarkers = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  align-content: flex-start;
  gap: 0.1rem 0.14rem;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  /* 잘림 방지: 줄바꿈으로 수용 (부모 칸 overflow는 유지) */
  overflow: visible;
  line-height: 1;
  font-size: 0.58rem;
  flex-shrink: 0;
  box-sizing: border-box;
`

const MarkerIcon = styled.span`
  flex: 0 0 auto;
  line-height: 1;
  font-size: 0.62rem;
`

const CellOvertimeStar = styled.span`
  color: #dc2626;
  font-size: 0.62rem;
  line-height: 1;
  flex: 0 0 auto;
  font-weight: 700;
`

const HiddenCount = styled.span`
  flex: 0 0 auto;
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--cal-text-dim, #6b7280);
  line-height: 1;
  white-space: nowrap;
  padding: 0.05rem 0.12rem;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.06);
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
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
`

const OvertimeLegend = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  min-width: 0;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--cal-text-dim, #6b7280);
  letter-spacing: -0.02em;
`

const OvertimeStar = styled.span`
  color: #dc2626;
  font-size: 0.85rem;
  line-height: 1;
  flex-shrink: 0;
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
  gap: 4px;
  margin-bottom: 0.4rem;
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
  grid-auto-rows: 6.5rem;
  width: 100%;
  min-width: 0;
  gap: 4px;
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
  height: 6.5rem;
  max-height: 6.5rem;
  min-height: 6.5rem;
  padding: 0.35rem 0.28rem 0.3rem 0.32rem;
  border: none;
  border-radius: 12px;
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
  gap: 0.2rem;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  flex: 1;
`

const DayHeader = styled.div`
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: flex-start;
  justify-content: flex-start;
  flex-shrink: 0;
`

const DayNum = styled.span<{ $isHoliday?: boolean }>`
  flex-shrink: 0;
  margin: 0;
  padding: 0 0.05rem;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: ${({ $isHoliday }) =>
    $isHoliday ? 'var(--cal-sun, #ef4444)' : 'inherit'};
`

const DayRecords = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
  flex-direction: column;
  overflow: hidden;
`

const LogBadge = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
  padding: 0.28rem 0.2rem;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.22);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.1rem;
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
  line-height: 1.1;
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

export default function MainCalendar() {
  const workLogs = useWageStore((s) => s.workLogs)
  const selectedDate = useWageStore((s) => s.selectedDate)
  const setSelectedDate = useWageStore((s) => s.setSelectedDate)

  const [cursor, setCursor] = useState(() => new Date())
  const [reportOpen, setReportOpen] = useState(false)
  const [showAmounts, setShowAmounts] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [navTab, setNavTab] = useState<BottomNavTab>('home')

  const exerciseRecords = useExerciseStore((s) => s.records)

  const year = cursor.getFullYear()
  const monthIndex = cursor.getMonth()

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

  const exerciseMonthSummary = useMemo(
    () => calculateMonthlyExerciseSummary(exerciseRecords, year, monthIndex),
    [exerciseRecords, year, monthIndex],
  )

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
      setSelectedDate(key)
    },
    [year, monthIndex, setSelectedDate],
  )

  const handleNavChange = useCallback((tab: BottomNavTab) => {
    setNavTab(tab)
    if (tab === 'home') {
      setReportOpen(false)
      setIsSettingsOpen(false)
      return
    }
    if (tab === 'report') {
      setIsSettingsOpen(false)
      setReportOpen(true)
      return
    }
    setReportOpen(false)
    setIsSettingsOpen(true)
  }, [])

  return (
    <AppFrame>
      <TopAppBar onOpenSettings={() => handleNavChange('settings')} />

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

          <MetricsRow>
            <MetricBlock>
              <MetricLabel>이번 달 총 수입</MetricLabel>
              <MetricValue $accent>{formatKRW(monthTotal)}</MetricValue>
            </MetricBlock>
            <MetricDivider aria-hidden />
            <MetricBlock>
              <MetricLabel>🏃 이번 달 운동</MetricLabel>
              <MetricValue>
                {exerciseMonthSummary.workoutDays}일
                {exerciseMonthSummary.totalDistanceKm > 0 && (
                  <>
                    {' '}
                    <MetricMeta>
                      {exerciseMonthSummary.totalDistanceKm.toFixed(1)}km
                    </MetricMeta>
                  </>
                )}
              </MetricValue>
            </MetricBlock>
          </MetricsRow>

          <QuickMenu>
            <QuickMenuBtn type="button" onClick={() => handleNavChange('report')}>
              <QuickIcon aria-hidden>📊</QuickIcon>
              <QuickLabel>상세보기</QuickLabel>
            </QuickMenuBtn>
          </QuickMenu>
        </Dashboard>
      </Card>

      <Card>
        <CalendarSection>
          <CalendarToolbar>
            <OvertimeLegend aria-label="연장근무 표시 안내">
              <OvertimeStar aria-hidden>★</OvertimeStar>
              <span>연장근무</span>
            </OvertimeLegend>
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
              const dayEx = dateKey ? exerciseRecords[dateKey] : undefined
              const hasIncome = log != null
              const hasExercise = Boolean(dayEx?.exercises?.length)
              const hasMemo = Boolean(dayEx?.memo?.trim())
              const hasOvertime = Boolean(log?.isOvertime)
              const recordSummary = buildDayRecordSummary({
                overtime: hasOvertime,
                income: hasIncome,
                exercise: hasExercise,
                memo: hasMemo,
              })

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
                      ? `${dateKey}${holidayName ? `, ${holidayName}` : ''}${hasIncome ? ', 수입 있음' : ''}${hasOvertime ? ', 연장근무' : ''}${hasExercise ? ', 운동 있음' : ''}${hasMemo ? ', 메모 있음' : ''}${log && showAmounts ? `, ${formatKRW(log.finalWage)}` : ''}`
                      : '빈 칸'
                  }
                >
                  {!muted && day != null && (
                    <DayCellBody>
                      <DayHeader>
                        <DayNum
                          className={isHoliday ? 'text-red-500' : undefined}
                          $isHoliday={isHoliday}
                        >
                          {day}
                        </DayNum>
                      </DayHeader>
                      {recordSummary.visible.length > 0 && (
                        <DayMarkers
                          aria-label={recordSummary.visible
                            .map((kind) => DAY_RECORD_LABEL[kind])
                            .concat(
                              recordSummary.hiddenCount > 0
                                ? [`외 ${recordSummary.hiddenCount}개`]
                                : [],
                            )
                            .join(', ')}
                        >
                          {recordSummary.visible.map((kind) =>
                            kind === 'overtime' ? (
                              <CellOvertimeStar key={kind} title="연장근무">
                                {DAY_RECORD_ICON[kind]}
                              </CellOvertimeStar>
                            ) : (
                              <MarkerIcon
                                key={kind}
                                title={DAY_RECORD_LABEL[kind]}
                              >
                                {DAY_RECORD_ICON[kind]}
                              </MarkerIcon>
                            ),
                          )}
                          {recordSummary.hiddenCount > 0 && (
                            <HiddenCount>
                              +{recordSummary.hiddenCount}
                            </HiddenCount>
                          )}
                        </DayMarkers>
                      )}
                      <DayRecords>
                        {log &&
                          (showAmounts ? (
                            <LogBadge>
                              <LogTitleWrap>
                                <LogTitle title={log.title}>{log.title}</LogTitle>
                              </LogTitleWrap>
                              <LogWageWrap>
                                <LogWage title={formatKRW(log.finalWage)}>
                                  <span>{formatKRWAmount(log.finalWage)}</span>
                                  <LogWageUnit>원</LogWageUnit>
                                </LogWage>
                              </LogWageWrap>
                            </LogBadge>
                          ) : (
                            <span
                              className="mx-auto inline-flex max-w-full items-center justify-center truncate rounded-md bg-indigo-100 px-2 py-[2px] text-[11px] font-medium leading-none text-indigo-700"
                              title={log.title}
                            >
                              {log.title}
                            </span>
                          ))}
                      </DayRecords>
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
        onClose={() => {
          setReportOpen(false)
          setNavTab('home')
        }}
        year={year}
        monthIndex={monthIndex}
        workLogs={workLogs}
      />

      <SettingsModal
        open={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false)
          setNavTab('home')
        }}
      />

      <BottomNavigation active={navTab} onChange={handleNavChange} />
    </AppFrame>
  )
}
