import styled from '@emotion/styled'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildWeekBuckets,
  monthCategoryTotals,
  pad2,
  sumMonthlyTotalIncome,
} from '../lib/monthlySettlement'
import type { WorkLogsMap } from '../store/useWageStore'

function formatKRW(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`
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
  padding: 0.65rem 1rem 0.75rem;
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
  const [visible, setVisible] = useState(false)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      const id = requestAnimationFrame(() => setVisible(false))
      return () => cancelAnimationFrame(id)
    }
    const id = requestAnimationFrame(() => {
      setExpandedKey(null)
      setVisible(true)
    })
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const ymPrefix = `${year}-${pad2(monthIndex + 1)}`

  const buckets = useMemo(
    () => buildWeekBuckets(workLogs, year, monthIndex),
    [workLogs, year, monthIndex],
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

  const handleBackdrop = useCallback(() => {
    setVisible(false)
    window.setTimeout(onClose, 300)
  }, [onClose])

  const toggleWeek = useCallback((weekStartKey: string) => {
    setExpandedKey((k) => (k === weekStartKey ? null : weekStartKey))
  }, [])

  if (!open && !visible) return null

  return (
    <Root $open={open}>
      <Backdrop type="button" aria-label="닫기" onClick={handleBackdrop} />
      <PanelWrap
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
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

          <Scroll>
            <Sub
              style={{
                fontSize: '0.68rem',
                marginBottom: '0.45rem',
                fontWeight: 800,
              }}
            >
              주차별 카드
            </Sub>
            {buckets.length === 0 ? (
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
              buckets.map((b) => {
                const expanded = expandedKey === b.weekStartKey
                return (
                  <WeekCard key={b.weekStartKey}>
                    <WeekHeadBtn
                      type="button"
                      $expanded={expanded}
                      onClick={() => toggleWeek(b.weekStartKey)}
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
                              <Th>템플릿</Th>
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
              · 일별 합계는 [선택한 템플릿 입금액] + [인센티브]로 계산됩니다.
              <br />· 각 템플릿은 실제 입금된 금액을 사용자가 직접 입력하여
              만든 것이므로 별도의 세전·세후·할증 보정을 적용하지 않습니다.
            </FooterNote>
          </Scroll>
        </Panel>
      </PanelWrap>
    </Root>
  )
}
