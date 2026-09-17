import styled from '@emotion/styled'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildWeekBuckets,
  monthCategoryTotals,
  pad2,
  sumMonthlyTotalIncome,
} from '../lib/monthlySettlement'
import {
  buildExerciseWeekBuckets,
  formatExerciseLine,
  sumMonthlyExerciseTotals,
} from '../lib/exerciseSettlement'
import {
  calcIncomeAchievementRatio,
  clampGaugePercent,
  formatRatioOneDecimal,
  parseWonInput,
  toWonInteger,
} from '../lib/financeMetrics'
import { formatDuration } from '../data/exerciseTemplates'
import { useWageStore, type WorkLogsMap } from '../store/useWageStore'
import { useExerciseStore } from '../store/useExerciseStore'

type DetailTab = 'income' | 'exercise'

function formatKRW(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

function formatKm(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0km'
  const rounded = Math.round(n * 10) / 10
  return `${rounded}km`
}

const Root = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 950;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
`

const Backdrop = styled.button`
  position: absolute;
  inset: 0;
  border: none;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  cursor: pointer;
  touch-action: manipulation;
`

const PanelWrap = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: none;
  padding: 0 env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0)
    env(safe-area-inset-left, 0);
`

const Panel = styled.div<{ $visible: boolean }>`
  pointer-events: auto;
  width: 100%;
  max-width: 480px;
  max-height: min(92dvh, 100%);
  background: var(--cal-surface, #fff);
  color: var(--cal-text, #111827);
  border-radius: 20px 20px 0 0;
  box-shadow:
    0 -12px 48px rgba(15, 23, 42, 0.22),
    0 -4px 16px rgba(15, 23, 42, 0.08);
  border: 1px solid var(--cal-border, rgba(15, 23, 42, 0.08));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(${({ $visible }) => ($visible ? '0' : '108%')});
  transition: transform 0.34s cubic-bezier(0.32, 0.72, 0, 1);
`

const Head = styled.div`
  flex-shrink: 0;
  padding: 0.65rem 1rem 0.55rem;
  border-bottom: 1px solid var(--cal-border, #e5e7eb);
`

const Grab = styled.div`
  width: 2.75rem;
  height: 4px;
  border-radius: 99px;
  background: var(--cal-muted-press, #e5e7eb);
  margin: 0 auto 0.65rem;
`

const Title = styled.h2`
  margin: 0 0 0.2rem;
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: -0.03em;
`

const Sub = styled.p`
  margin: 0;
  font-size: 0.72rem;
  color: var(--cal-text-dim, #6b7280);
  font-weight: 600;
`

const TabBar = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
  padding: 0.65rem 1rem 0.55rem;
  background: var(--cal-surface, #fff);
  border-bottom: 1px solid var(--cal-border, #f3f4f6);
`

const TabBtn = styled.button<{ $active: boolean }>`
  min-height: 2.6rem;
  border-radius: 12px;
  border: 1px solid
    ${({ $active }) => ($active ? 'transparent' : 'var(--cal-border, #e5e7eb)')};
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)'
      : 'var(--cal-muted, #f3f4f6)'};
  color: ${({ $active }) => ($active ? '#fff' : 'var(--cal-text-dim, #6b7280)')};
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: ${({ $active }) =>
    $active ? '0 6px 14px rgba(79, 70, 229, 0.25)' : 'none'};

  &:active {
    transform: scale(0.98);
  }
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.85rem;
  background: var(--cal-muted, #f9fafb);
`

const SumCard = styled.div`
  background: var(--cal-surface, #fff);
  border-radius: 12px;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--cal-border, #e5e7eb);
`

const SumLabel = styled.div`
  font-size: 0.62rem;
  font-weight: 800;
  color: var(--cal-text-dim, #6b7280);
  letter-spacing: 0.04em;
  margin-bottom: 0.2rem;
`

const SumVal = styled.div`
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--cal-accent-strong, #4338ca);
`

const Scroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.65rem 1rem 1rem;
`

const WeekCard = styled.div`
  border-radius: 14px;
  border: 1px solid var(--cal-border, #e5e7eb);
  background: var(--cal-surface, #fff);
  margin-bottom: 0.55rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
`

const WeekHeadBtn = styled.button<{ $expanded: boolean }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  padding: 0.7rem 0.75rem;
  border: none;
  background: ${({ $expanded }) =>
    $expanded ? 'var(--cal-accent-soft, #eef2ff)' : 'var(--cal-muted, #fafafa)'};
  cursor: pointer;
  touch-action: manipulation;
  text-align: left;
  color: inherit;
  transition: background 0.15s ease;

  &:active {
    filter: brightness(0.97);
  }
`

const WeekHeadTop = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const WeekTitle = styled.span`
  font-size: 0.85rem;
  font-weight: 900;
`

const Chevron = styled.span<{ $expanded: boolean }>`
  font-size: 0.75rem;
  font-weight: 900;
  color: var(--cal-text-dim, #6b7280);
  transform: rotate(${({ $expanded }) => ($expanded ? '180deg' : '0')});
  transition: transform 0.22s ease;
`

const WeekMeta = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--cal-text-dim, #6b7280);
  line-height: 1.35;
`

const AccBody = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  border-top: 1px solid var(--cal-border, #e5e7eb);
`

const TableWrap = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.65rem;
`

const Th = styled.th`
  text-align: left;
  padding: 0.4rem 0.35rem;
  font-weight: 800;
  color: var(--cal-text-dim, #6b7280);
  background: var(--cal-surface, #fff);
  border-bottom: 1px solid var(--cal-border, #e5e7eb);
`

const Td = styled.td`
  padding: 0.45rem 0.35rem;
  border-bottom: 1px solid var(--cal-border, #f3f4f6);
  vertical-align: top;
  font-weight: 600;
`

const FooterNote = styled.p`
  margin: 0.5rem 0 0;
  font-size: 0.62rem;
  color: var(--cal-text-dim, #6b7280);
  line-height: 1.45;
`

const StatusSection = styled.div`
  margin: 0 0 0.75rem;
  padding: 0.85rem 0.9rem;
  border-radius: 14px;
  border: 1px solid var(--cal-border, #e5e7eb);
  background: var(--cal-surface, #fff);
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`

const StatusTitle = styled.h3`
  margin: 0;
  font-size: 0.88rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--cal-text, #111827);
`

const GoalTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`

const GoalLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--cal-text-dim, #6b7280);
`

const GoalInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
`

const GoalInput = styled.input`
  width: 7.5rem;
  max-width: 40vw;
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

const DayBlock = styled.div`
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--cal-border, #f3f4f6);

  &:last-child {
    border-bottom: none;
  }
`

const DayLabel = styled.p`
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 900;
  color: #111827;
`

const ExLine = styled.li`
  margin: 0;
  padding: 0.15rem 0;
  font-size: 0.7rem;
  font-weight: 700;
  color: #4b5563;
  line-height: 1.35;
  word-break: keep-all;
`

export interface MonthlyReportModalProps {
  open: boolean
  onClose: () => void
  year: number
  monthIndex: number
  workLogs: WorkLogsMap
}

export default function MonthlyReportModal({
  open,
  onClose,
  year,
  monthIndex,
  workLogs,
}: MonthlyReportModalProps) {
  const monthlyGoals = useWageStore((s) => s.monthlyGoals)
  const setMonthlyGoal = useWageStore((s) => s.setMonthlyGoal)
  const exerciseRecords = useExerciseStore((s) => s.records)

  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState<DetailTab>('income')
  const [expandedIncomeKey, setExpandedIncomeKey] = useState<string | null>(
    null,
  )
  const [expandedExerciseKeys, setExpandedExerciseKeys] = useState<Set<string>>(
    () => new Set(),
  )

  useEffect(() => {
    if (!open) {
      const id = requestAnimationFrame(() => setVisible(false))
      return () => cancelAnimationFrame(id)
    }
    const id = requestAnimationFrame(() => {
      setExpandedIncomeKey(null)
      setExpandedExerciseKeys(new Set())
      setTab('income')
      setVisible(true)
    })
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    setExpandedIncomeKey(null)
    setExpandedExerciseKeys(new Set())
  }, [year, monthIndex])

  const ymPrefix = `${year}-${pad2(monthIndex + 1)}`
  const yearMonthKey = ymPrefix

  const incomeBuckets = useMemo(
    () => buildWeekBuckets(workLogs, year, monthIndex),
    [workLogs, year, monthIndex],
  )

  const exerciseBuckets = useMemo(
    () => buildExerciseWeekBuckets(exerciseRecords, year, monthIndex),
    [exerciseRecords, year, monthIndex],
  )

  const exerciseMonthTotals = useMemo(
    () => sumMonthlyExerciseTotals(exerciseRecords, year, monthIndex),
    [exerciseRecords, year, monthIndex],
  )

  const monthTitle = useMemo(
    () =>
      new Date(year, monthIndex, 1).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
      }),
    [year, monthIndex],
  )

  const cat = useMemo(
    () => monthCategoryTotals(workLogs, ymPrefix),
    [workLogs, ymPrefix],
  )

  const monthIncomeTotal = useMemo(
    () => sumMonthlyTotalIncome(workLogs, year, monthIndex),
    [workLogs, year, monthIndex],
  )

  const monthlyGoal = useMemo(
    () => toWonInteger(monthlyGoals[yearMonthKey] ?? 0),
    [monthlyGoals, yearMonthKey],
  )
  const totalIncome = useMemo(
    () => toWonInteger(monthIncomeTotal),
    [monthIncomeTotal],
  )
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

  const handleBackdrop = useCallback(() => {
    setVisible(false)
    window.setTimeout(onClose, 300)
  }, [onClose])

  const toggleIncomeWeek = useCallback((weekStartKey: string) => {
    setExpandedIncomeKey((k) => (k === weekStartKey ? null : weekStartKey))
  }, [])

  const toggleExerciseWeek = useCallback((weekStartKey: string) => {
    setExpandedExerciseKeys((prev) => {
      const next = new Set(prev)
      if (next.has(weekStartKey)) next.delete(weekStartKey)
      else next.add(weekStartKey)
      return next
    })
  }, [])

  const handleGoalChange = useCallback(
    (raw: string) => {
      setMonthlyGoal(yearMonthKey, parseWonInput(raw))
    },
    [setMonthlyGoal, yearMonthKey],
  )

  if (!open && !visible) return null

  return (
    <Root $open={open}>
      <Backdrop type="button" aria-label="닫기" onClick={handleBackdrop} />
      <PanelWrap onClick={(e) => e.stopPropagation()}>
        <Panel
          $visible={visible && open}
          role="dialog"
          aria-modal="true"
          aria-labelledby="monthly-report-title"
        >
          <Head>
            <Grab />
            <Title id="monthly-report-title">주차별 상세 명세</Title>
            <Sub>{monthTitle} · 일요일~토요일 기준 주차</Sub>
          </Head>

          <TabBar role="tablist" aria-label="상세보기 구분">
            <TabBtn
              type="button"
              role="tab"
              aria-selected={tab === 'income'}
              $active={tab === 'income'}
              onClick={() => setTab('income')}
            >
              수입
            </TabBtn>
            <TabBtn
              type="button"
              role="tab"
              aria-selected={tab === 'exercise'}
              $active={tab === 'exercise'}
              onClick={() => setTab('exercise')}
            >
              운동
            </TabBtn>
          </TabBar>

          {tab === 'income' ? (
            <>
              <SummaryGrid>
                <SumCard>
                  <SumLabel>템플릿 입금액 합계</SumLabel>
                  <SumVal>{formatKRW(cat.amount)}</SumVal>
                </SumCard>
                <SumCard>
                  <SumLabel>인센티브 합계</SumLabel>
                  <SumVal>{formatKRW(cat.incentive)}</SumVal>
                </SumCard>
                <SumCard style={{ gridColumn: '1 / -1' }}>
                  <SumLabel>당월 총 수입 (일별 합계)</SumLabel>
                  <SumVal>{formatKRW(monthIncomeTotal)}</SumVal>
                </SumCard>
              </SummaryGrid>

              <div style={{ padding: '0 1rem' }}>
                <StatusSection>
                  <StatusTitle>월간 현황</StatusTitle>
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
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        원
                      </span>
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
                      목표 달성률{' '}
                      {monthlyGoal > 0
                        ? `${incomeAchievementLabel}%`
                        : '미설정'}
                    </span>
                    <span>
                      {monthlyGoal > 0
                        ? `${formatKRW(totalIncome)} / ${formatKRW(monthlyGoal)}`
                        : '—'}
                    </span>
                  </ProgressMeta>
                </StatusSection>
              </div>

              <Scroll>
                <Sub
                  style={{
                    fontSize: '0.68rem',
                    marginBottom: '0.45rem',
                    fontWeight: 800,
                  }}
                >
                  주차별 수입 카드
                </Sub>
                {incomeBuckets.length === 0 ? (
                  <Sub
                    style={{
                      fontSize: '0.75rem',
                      marginBottom: '0.45rem',
                      fontWeight: 700,
                      color: 'var(--cal-text-dim, #6b7280)',
                    }}
                  >
                    이번 달에 등록된 근무가 없어 주차별 카드가 없습니다.
                  </Sub>
                ) : (
                  incomeBuckets.map((b) => {
                    const expanded = expandedIncomeKey === b.weekStartKey
                    return (
                      <WeekCard key={b.weekStartKey}>
                        <WeekHeadBtn
                          type="button"
                          $expanded={expanded}
                          onClick={() => toggleIncomeWeek(b.weekStartKey)}
                        >
                          <WeekHeadTop>
                            <WeekTitle>
                              {b.weekIndex}주차 ({b.weekRangeLabel})
                            </WeekTitle>
                            <Chevron $expanded={expanded}>▼</Chevron>
                          </WeekHeadTop>
                          <WeekMeta>당월 근무 {b.rows.length}일</WeekMeta>
                          <WeekMeta>
                            입금액 {formatKRW(b.amountSum)} · 인센{' '}
                            {formatKRW(b.incentiveSum)} · 합계{' '}
                            {formatKRW(b.finalWageSum)}
                          </WeekMeta>
                        </WeekHeadBtn>
                        <AccBody $open={expanded}>
                          <TableWrap>
                            <Table>
                              <thead>
                                <tr>
                                  <Th>날짜</Th>
                                  <Th>근무지</Th>
                                  <Th style={{ textAlign: 'right' }}>입금액</Th>
                                  <Th style={{ textAlign: 'right' }}>인센</Th>
                                  <Th style={{ textAlign: 'right' }}>일 계</Th>
                                </tr>
                              </thead>
                              <tbody>
                                {b.rows.map((r) => (
                                  <tr key={r.dateKey}>
                                    <Td>
                                      {r.dateKey.slice(5)} ({r.weekdayLabel})
                                    </Td>
                                    <Td>{r.entry.title}</Td>
                                    <Td style={{ textAlign: 'right' }}>
                                      {formatKRW(r.entry.amount)}
                                    </Td>
                                    <Td style={{ textAlign: 'right' }}>
                                      {formatKRW(r.entry.incentive)}
                                    </Td>
                                    <Td style={{ textAlign: 'right' }}>
                                      {formatKRW(r.entry.finalWage)}
                                    </Td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </TableWrap>
                        </AccBody>
                      </WeekCard>
                    )
                  })
                )}
                <FooterNote>
                  · 일별 합계는 [기본급] + [인센티브]로 계산됩니다.
                  <br />· 연장근무 여부는 금액 계산에 포함되지 않습니다.
                </FooterNote>
              </Scroll>
            </>
          ) : (
            <>
              <SummaryGrid>
                <SumCard>
                  <SumLabel>운동한 날</SumLabel>
                  <SumVal>{exerciseMonthTotals.workoutDays}일</SumVal>
                </SumCard>
                <SumCard>
                  <SumLabel>총 운동 시간</SumLabel>
                  <SumVal>
                    {formatDuration(exerciseMonthTotals.totalMinutes)}
                  </SumVal>
                </SumCard>
                {exerciseMonthTotals.totalDistanceKm > 0 && (
                  <SumCard style={{ gridColumn: '1 / -1' }}>
                    <SumLabel>총 운동 거리</SumLabel>
                    <SumVal>
                      {formatKm(exerciseMonthTotals.totalDistanceKm)}
                    </SumVal>
                  </SumCard>
                )}
              </SummaryGrid>

              <Scroll>
                <Sub
                  style={{
                    fontSize: '0.68rem',
                    marginBottom: '0.45rem',
                    fontWeight: 800,
                  }}
                >
                  주차별 운동 카드 · 기본 접힘
                </Sub>
                {exerciseBuckets.map((b) => {
                  const expanded = expandedExerciseKeys.has(b.weekStartKey)
                  const hasRecords = b.workoutDays > 0
                  return (
                    <WeekCard key={b.weekStartKey}>
                      <WeekHeadBtn
                        type="button"
                        $expanded={expanded}
                        onClick={() => toggleExerciseWeek(b.weekStartKey)}
                      >
                        <WeekHeadTop>
                          <WeekTitle>
                            {b.weekIndex}주차 ({b.weekRangeLabel})
                          </WeekTitle>
                          <Chevron $expanded={expanded}>▼</Chevron>
                        </WeekHeadTop>
                        {hasRecords ? (
                          <>
                            <WeekMeta>운동한 날 {b.workoutDays}일</WeekMeta>
                            <WeekMeta>
                              총 시간 {formatDuration(b.totalMinutes)}
                              {b.totalDistanceKm > 0
                                ? ` · 거리 ${formatKm(b.totalDistanceKm)}`
                                : ''}
                            </WeekMeta>
                            <WeekMeta>운동 종목 {b.uniqueTypeCount}개</WeekMeta>
                          </>
                        ) : (
                          <WeekMeta>운동 기록 없음</WeekMeta>
                        )}
                      </WeekHeadBtn>
                      <AccBody $open={expanded}>
                        {hasRecords ? (
                          b.dayGroups.map((g) => {
                            const [, mm, dd] = g.dateKey.split('-')
                            return (
                              <DayBlock key={g.dateKey}>
                                <DayLabel>
                                  {Number(mm)}월 {Number(dd)}일 (
                                  {g.weekdayLabel})
                                </DayLabel>
                                <ul
                                  style={{
                                    margin: 0,
                                    padding: 0,
                                    listStyle: 'none',
                                  }}
                                >
                                  {g.exercises.map((ex) => (
                                    <ExLine key={ex.id}>
                                      · {formatExerciseLine(ex)}
                                    </ExLine>
                                  ))}
                                </ul>
                              </DayBlock>
                            )
                          })
                        ) : (
                          <DayBlock>
                            <WeekMeta>
                              이 주차(당월 {b.monthClippedLabel})에는 기록된
                              운동이 없습니다.
                            </WeekMeta>
                          </DayBlock>
                        )}
                      </AccBody>
                    </WeekCard>
                  )
                })}
                <FooterNote>
                  · 주차는 일요일~토요일 달력 범위로 표시합니다.
                  <br />· 운동량 집계는 선택한 달의 1일~말일 기록만 포함합니다.
                </FooterNote>
              </Scroll>
            </>
          )}
        </Panel>
      </PanelWrap>
    </Root>
  )
}
