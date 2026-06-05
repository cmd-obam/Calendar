import styled from '@emotion/styled'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  computeFinalDailyWage,
  useWageStore,
} from '../store/useWageStore'
import { getHolidayName } from '../utils/holidays'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatKoreanTitleDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return `${y}년 ${pad2(m)}월 ${pad2(d)}일 근무 기록`
}

function formatKRW(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

function parseMoneyInput(raw: string): number {
  const v = Number(raw.replace(/,/g, '').trim())
  return Number.isFinite(v) && v > 0 ? v : 0
}

function todayDateKey(): string {
  const t = new Date()
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

const Root = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
`

const Backdrop = styled.button`
  position: absolute;
  inset: 0;
  border: none;
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(3px);
  cursor: pointer;
  touch-action: manipulation;
`

const SheetWrap = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  padding-bottom: env(safe-area-inset-bottom, 0);
`

const Sheet = styled.div<{ $visible: boolean }>`
  pointer-events: auto;
  width: 100%;
  max-width: 480px;
  max-height: min(94dvh, 100%);
  background: var(--cal-surface, #ffffff);
  color: var(--cal-text, #111827);
  border-radius: 22px 22px 0 0;
  box-shadow:
    0 -12px 48px rgba(15, 23, 42, 0.24),
    0 -4px 16px rgba(15, 23, 42, 0.08);
  border: 1px solid var(--cal-border, rgba(15, 23, 42, 0.08));
  border-bottom: none;
  transform: translateY(${({ $visible }) => ($visible ? '0' : '108%')});
  transition: transform 0.34s cubic-bezier(0.32, 0.72, 0, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Grabber = styled.div`
  padding: 0.5rem 0 0.25rem;
  display: flex;
  justify-content: center;
`

const GrabBar = styled.div`
  width: 2.75rem;
  height: 5px;
  border-radius: 99px;
  background: var(--cal-muted-press, #e5e7eb);
`

const HeaderBlock = styled.div`
  flex-shrink: 0;
  padding: 0.35rem 1.1rem 0.85rem;
  border-bottom: 1px solid var(--cal-border, #f3f4f6);
`

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`

const Scroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.75rem 1.1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const DateHeadline = styled.h2`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.25;
`

const Hint = styled.p`
  margin: 0;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--cal-text-dim, #6b7280);
  line-height: 1.4;
`

const CloseBtn = styled.button`
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  margin-top: -0.15rem;
  margin-right: -0.25rem;
  border: none;
  border-radius: 14px;
  background: var(--cal-muted, #f3f4f6);
  color: var(--cal-text, #111827);
  font-size: 1.35rem;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    background: var(--cal-muted-press, #e5e7eb);
    transform: scale(0.96);
  }
`

const HeaderText = styled.div`
  flex: 1;
  min-width: 0;
`

const FormPanel = styled.div`
  padding: 1rem 1.05rem;
  border-radius: 16px;
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
  border: 1px solid var(--cal-border, #e5e7eb);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`

const FieldLabel = styled.span`
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--cal-text-dim, #6b7280);
`

const Input = styled.input`
  width: 100%;
  padding: 0.85rem 0.95rem;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 14px;
  border: 1px solid var(--cal-border, #e5e7eb);
  background: var(--cal-surface, #fff);
  color: inherit;
  min-height: 52px;
  box-sizing: border-box;

  &:focus {
    outline: 3px solid rgba(99, 102, 241, 0.35);
    outline-offset: 0;
  }

  &::placeholder {
    color: var(--cal-text-dim, #9ca3af);
    font-weight: 600;
  }
`

const StickyBottom = styled.div`
  flex-shrink: 0;
  padding: 0.65rem 1.1rem 1.1rem;
  padding-bottom: calc(1.1rem + env(safe-area-inset-bottom, 0));
  border-top: 1px solid var(--cal-border, #e5e7eb);
  background: var(--cal-surface, #fff);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const FinalLine = styled.div`
  text-align: center;
  padding: 0.35rem 0;
`

const FinalCombined = styled.p`
  margin: 0;
  font-size: 1.38rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--cal-accent-strong, #4338ca);
  line-height: 1.4;
`

const FinalStrong = styled.strong`
  font-weight: 900;
  color: var(--cal-text, #111827);
`

const ActionRow = styled.div`
  display: flex;
  gap: 0.65rem;
  align-items: stretch;
`

const DeleteRecordBtn = styled.button`
  flex-shrink: 0;
  min-width: 5.75rem;
  padding: 1rem 0.9rem;
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
  color: #fff;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 10px 24px rgba(220, 38, 38, 0.38);

  &:active {
    transform: scale(0.99);
  }
`

const SubmitBtn = styled.button`
  flex: 1;
  min-height: 56px;
  padding: 1rem 1.25rem;
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  border: none;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    #4f46e5 0%,
    var(--cal-accent-mid, #818cf8) 100%
  );
  color: #fff;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 10px 28px rgba(79, 70, 229, 0.38);

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:active:not(:disabled) {
    transform: scale(0.99);
  }
`

export interface CalendarEntryModalProps {
  open: boolean
  onClose: () => void
}

export default function CalendarEntryModal({
  open,
  onClose,
}: CalendarEntryModalProps) {
  const workLogs = useWageStore((s) => s.workLogs)
  const selectedDate = useWageStore((s) => s.selectedDate)
  const addWorkLog = useWageStore((s) => s.addWorkLog)
  const deleteWageRecord = useWageStore((s) => s.deleteWageRecord)

  const existingRecord = useMemo(
    () => (selectedDate ? workLogs[selectedDate] : undefined),
    [selectedDate, workLogs],
  )
  const holidayName = useMemo(
    () => (selectedDate ? getHolidayName(selectedDate) : undefined),
    [selectedDate],
  )
  const hasExistingRecord = existingRecord != null

  const [sheetVisible, setSheetVisible] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [salaryRaw, setSalaryRaw] = useState('')
  const [incentiveRaw, setIncentiveRaw] = useState('')

  const resetForm = useCallback(() => {
    setCompanyName('')
    setSalaryRaw('')
    setIncentiveRaw('')
  }, [])

  /** 선택된 날짜·기록 여부에 따라 입력 폼 동기화 */
  useEffect(() => {
    if (!open || !selectedDate) return
    const record = workLogs[selectedDate]
    if (record) {
      setCompanyName(record.title)
      setSalaryRaw(record.amount > 0 ? String(record.amount) : '')
      setIncentiveRaw(record.incentive > 0 ? String(record.incentive) : '')
    } else {
      resetForm()
    }
  }, [open, selectedDate, workLogs, resetForm])

  useEffect(() => {
    if (!open) {
      const id = requestAnimationFrame(() => setSheetVisible(false))
      return () => cancelAnimationFrame(id)
    }
    const id = requestAnimationFrame(() => setSheetVisible(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = prev
    }
  }, [open])

  const salaryNum = useMemo(() => parseMoneyInput(salaryRaw), [salaryRaw])
  const incentiveNum = useMemo(
    () => parseMoneyInput(incentiveRaw),
    [incentiveRaw],
  )

  const finalPreview = useMemo(
    () => computeFinalDailyWage(salaryNum, incentiveNum),
    [salaryNum, incentiveNum],
  )

  const isToday = selectedDate != null && selectedDate === todayDateKey()
  const canSubmit =
    selectedDate != null &&
    companyName.trim().length > 0 &&
    salaryNum > 0

  const closeAnimated = useCallback(() => {
    setSheetVisible(false)
    window.setTimeout(() => {
      onClose()
      resetForm()
    }, 320)
  }, [onClose, resetForm])

  const closeImmediate = useCallback(() => {
    resetForm()
    setSheetVisible(false)
    onClose()
  }, [onClose, resetForm])

  const handleBackdrop = useCallback(() => {
    closeImmediate()
  }, [closeImmediate])

  const handleSubmit = useCallback(() => {
    if (!selectedDate || !canSubmit) return
    addWorkLog(
      selectedDate,
      companyName.trim(),
      salaryNum,
      incentiveNum,
    )
    closeAnimated()
  }, [
    selectedDate,
    canSubmit,
    addWorkLog,
    companyName,
    salaryNum,
    incentiveNum,
    closeAnimated,
  ])

  const handleDeleteRecord = useCallback(() => {
    if (!selectedDate || !hasExistingRecord) return
    if (
      !window.confirm('이 날의 근무 기록을 정말 삭제하시겠습니까?')
    ) {
      return
    }
    deleteWageRecord(selectedDate)
    resetForm()
  }, [selectedDate, hasExistingRecord, deleteWageRecord, resetForm])

  if (!open && !sheetVisible) return null

  return (
    <Root $open={open}>
      <Backdrop type="button" aria-label="닫기" onClick={handleBackdrop} />
      <SheetWrap
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <Sheet
          $visible={sheetVisible && open}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cal-entry-date-title"
        >
          <Grabber>
            <GrabBar />
          </Grabber>

          {selectedDate && (
            <HeaderBlock>
              <HeaderRow>
                <HeaderText>
                  <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <DateHeadline id="cal-entry-date-title">
                      {formatKoreanTitleDate(selectedDate)}
                    </DateHeadline>
                    {holidayName && (
                      <span className="inline-flex max-w-full shrink-0 items-center rounded-md bg-red-50 px-2 py-0.5 text-sm font-bold leading-snug text-red-500 ring-1 ring-inset ring-red-200/90">
                        {holidayName}
                      </span>
                    )}
                  </div>
                  <Hint>근무 정보 및 급여 입력</Hint>
                </HeaderText>
                <CloseBtn
                  type="button"
                  aria-label="닫기 (저장 안 함)"
                  onClick={closeImmediate}
                >
                  ×
                </CloseBtn>
              </HeaderRow>
            </HeaderBlock>
          )}

          <Scroll>
            <FormPanel>
              <FieldGroup>
                <FieldLabel>회사명 (또는 근무지)</FieldLabel>
                <Input
                  placeholder="예: 쿠팡, 배달의민족 등"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  enterKeyHint="next"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>급여 (기본급)</FieldLabel>
                <Input
                  placeholder="공제 후 실제 받은 급여 입력"
                  inputMode="numeric"
                  value={salaryRaw}
                  onChange={(e) => setSalaryRaw(e.target.value)}
                  enterKeyHint="next"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>인센티브 (프로모션 수당)</FieldLabel>
                <Input
                  placeholder="추가 수당 입력 (없으면 비워두기)"
                  inputMode="numeric"
                  value={incentiveRaw}
                  onChange={(e) => setIncentiveRaw(e.target.value)}
                  enterKeyHint="done"
                />
              </FieldGroup>
            </FormPanel>
          </Scroll>

          <StickyBottom>
            <FinalLine>
              <FinalCombined>
                <FinalStrong>
                  {isToday ? '오늘의 최종 급여' : '최종 급여'}
                </FinalStrong>
                {': '}
                {formatKRW(finalPreview)}
              </FinalCombined>
            </FinalLine>
            <ActionRow>
              <SubmitBtn
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {hasExistingRecord ? '수정하기' : '+ 근무 등록하기'}
              </SubmitBtn>
              {hasExistingRecord && (
                <DeleteRecordBtn
                  type="button"
                  aria-label="이 날의 근무 기록 삭제"
                  onClick={handleDeleteRecord}
                >
                  삭제하기
                </DeleteRecordBtn>
              )}
            </ActionRow>
          </StickyBottom>
        </Sheet>
      </SheetWrap>
    </Root>
  )
}
