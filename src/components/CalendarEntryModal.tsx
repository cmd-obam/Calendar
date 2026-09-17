import styled from '@emotion/styled'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ExerciseEntryForm from './ExerciseEntryForm'
import {
  exerciseTemplates,
  formatExerciseSummary,
  type ExerciseItem,
  type ExerciseTemplate,
} from '../data/exerciseTemplates'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { useWageStore } from '../store/useWageStore'
import { useExerciseStore } from '../store/useExerciseStore'
import { getHolidayName } from '../utils/holidays'

type ModalView =
  | 'overview'
  | 'wage'
  | 'exercise-pick'
  | 'exercise-form'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatKoreanTitleDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return `${y}년 ${pad2(m)}월 ${pad2(d)}일`
}

function formatKRW(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

function parseMoneyInput(raw: string): number {
  const v = Number(raw.replace(/,/g, '').trim())
  return Number.isFinite(v) && v > 0 ? v : 0
}

/** 0 이상 허용 (인센티브 비움 = 0) */
function parseMoneyInputAllowZero(raw: string): number {
  const trimmed = raw.replace(/,/g, '').trim()
  if (trimmed === '') return 0
  const v = Number(trimmed)
  return Number.isFinite(v) && v >= 0 ? v : 0
}

function todayDateKey(): string {
  const t = new Date()
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

const Root = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  /* 배경 터치 스크롤이 Root를 통해 전파되지 않도록 */
  touch-action: none;
  overscroll-behavior: none;
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
  touch-action: none;
`

const SheetWrap = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 480px;
  max-height: min(92dvh, 100%);
  display: flex;
  flex-direction: column;
  pointer-events: none;
  padding-bottom: env(safe-area-inset-bottom, 0);
  min-height: 0;
  box-sizing: border-box;
`

const Sheet = styled.div<{ $visible: boolean }>`
  pointer-events: auto;
  touch-action: pan-y;
  width: 100%;
  max-height: min(92dvh, 100%);
  min-height: 0;
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
  box-sizing: border-box;
`

const Grabber = styled.div`
  flex-shrink: 0;
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

const HeaderText = styled.div`
  flex: 1;
  min-width: 0;
`

const DateHeadline = styled.h2`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.25;
`

const Hint = styled.p`
  margin: 0.35rem 0 0;
  font-size: 0.72rem;
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

const Scroll = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  /* 헤더·하단 고정 버튼 영역을 남기고 내부만 스크롤 */
  max-height: min(68dvh, calc(92dvh - 10rem));
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
  padding: 0.75rem 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`

/** 운동 기록이 많을 때 목록만 내부 스크롤해 수입·메모 접근성 유지 */
const ExerciseList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: min(40vh, 16rem);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
`

const SectionCard = styled.section`
  border-radius: 16px;
  border: 1px solid var(--cal-border, #e5e7eb);
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
  padding: 0.9rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 0.92rem;
  font-weight: 900;
  letter-spacing: -0.02em;
`

const EmptyText = styled.p`
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: #9ca3af;
`

const AddBtn = styled.button`
  width: 100%;
  min-height: 44px;
  border-radius: 12px;
  border: 2px dashed #c7d2fe;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.88rem;
  font-weight: 900;
  cursor: pointer;
  touch-action: manipulation;

  &:active {
    transform: scale(0.99);
    background: #e0e7ff;
  }
`

const GhostBtn = styled.button`
  border: none;
  background: transparent;
  color: #4f46e5;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  padding: 0.25rem 0.35rem;
`

const DangerBtn = styled.button`
  border: none;
  background: transparent;
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  padding: 0.25rem 0.35rem;
`

const BackBtn = styled.button`
  align-self: flex-start;
  border: none;
  background: #f3f4f6;
  color: #374151;
  font-size: 0.78rem;
  font-weight: 800;
  border-radius: 10px;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
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

  &:disabled {
    background: #f3f4f6;
    color: #4338ca;
    cursor: default;
  }
`

const AutoHint = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  color: #9ca3af;
`

const OvertimeToggle = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  min-height: 52px;
  padding: 0.75rem 0.95rem;
  border-radius: 14px;
  border: 1px solid
    ${({ $on }) => ($on ? 'rgba(79, 70, 229, 0.35)' : '#e5e7eb')};
  background: ${({ $on }) => ($on ? '#eef2ff' : '#fff')};
  cursor: pointer;
  text-align: left;
`

const OvertimeLabel = styled.span`
  font-size: 0.92rem;
  font-weight: 800;
  color: #111827;
`

const CheckBox = styled.span<{ $on: boolean }>`
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 6px;
  border: 2px solid ${({ $on }) => ($on ? '#4f46e5' : '#d1d5db')};
  background: ${({ $on }) => ($on ? '#4f46e5' : '#fff')};
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 900;
  flex-shrink: 0;
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

const FinalCombined = styled.p`
  margin: 0;
  text-align: center;
  font-size: 1.28rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--cal-accent-strong, #4338ca);
`

const ActionRow = styled.div`
  display: flex;
  gap: 0.65rem;
  align-items: stretch;
`

const SubmitBtn = styled.button`
  flex: 1;
  min-height: 56px;
  padding: 1rem 1.25rem;
  font-size: 1.05rem;
  font-weight: 900;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(79, 70, 229, 0.38);

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
`

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 0.75rem;
  font-size: 0.82rem;
`

const DetailKey = styled.span`
  color: #6b7280;
  font-weight: 700;
`

const DetailVal = styled.span`
  text-align: right;
  font-weight: 800;
  color: #111827;
`

const ListItem = styled.li`
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const ListMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const TemplateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const TemplateBtn = styled.button`
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.95rem;
  font-weight: 800;
  text-align: left;
  padding: 0.75rem 0.95rem;
  cursor: pointer;

  &:active {
    background: #eef2ff;
  }
`

const MemoArea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.45;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;

  &:focus {
    outline: 3px solid rgba(99, 102, 241, 0.3);
  }
`

const MemoSaveBtn = styled.button`
  align-self: flex-end;
  min-height: 40px;
  padding: 0.5rem 0.9rem;
  border: none;
  border-radius: 10px;
  background: #4f46e5;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
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

  const records = useExerciseStore((s) => s.records)
  const addExercise = useExerciseStore((s) => s.addExercise)
  const updateExercise = useExerciseStore((s) => s.updateExercise)
  const deleteExercise = useExerciseStore((s) => s.deleteExercise)
  const updateMemo = useExerciseStore((s) => s.updateMemo)

  const existingRecord = useMemo(
    () => (selectedDate ? workLogs[selectedDate] : undefined),
    [selectedDate, workLogs],
  )
  const holidayName = useMemo(
    () => (selectedDate ? getHolidayName(selectedDate) : undefined),
    [selectedDate],
  )
  const hasExistingRecord = existingRecord != null

  const dayExercise = useMemo(
    () =>
      selectedDate
        ? (records[selectedDate] ?? { exercises: [], memo: '' })
        : { exercises: [], memo: '' },
    [records, selectedDate],
  )

  const [sheetVisible, setSheetVisible] = useState(false)
  const [view, setView] = useState<ModalView>('overview')
  const [selectedTemplate, setSelectedTemplate] =
    useState<ExerciseTemplate | null>(null)
  const [editingExercise, setEditingExercise] = useState<ExerciseItem | null>(
    null,
  )
  const [companyName, setCompanyName] = useState('')
  const [totalRaw, setTotalRaw] = useState('')
  const [incentiveRaw, setIncentiveRaw] = useState('')
  const [isOvertime, setIsOvertime] = useState(false)
  const [memoDraft, setMemoDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useBodyScrollLock(open)

  const resetWageForm = useCallback(() => {
    setCompanyName('')
    setTotalRaw('')
    setIncentiveRaw('')
    setIsOvertime(false)
  }, [])

  const resetNav = useCallback(() => {
    setView('overview')
    setSelectedTemplate(null)
    setEditingExercise(null)
  }, [])

  useEffect(() => {
    if (!open || !selectedDate) return
    const record = workLogs[selectedDate]
    if (record) {
      setCompanyName(record.title)
      const total =
        record.finalWage > 0
          ? record.finalWage
          : record.amount + record.incentive
      setTotalRaw(total > 0 ? String(total) : '')
      setIncentiveRaw(record.incentive > 0 ? String(record.incentive) : '')
      setIsOvertime(Boolean(record.isOvertime))
    } else {
      resetWageForm()
    }
    setMemoDraft(records[selectedDate]?.memo ?? '')
    resetNav()
  }, [open, selectedDate, workLogs, records, resetWageForm, resetNav])

  useEffect(() => {
    if (!open) {
      const id = requestAnimationFrame(() => setSheetVisible(false))
      return () => cancelAnimationFrame(id)
    }
    const id = requestAnimationFrame(() => {
      setSheetVisible(true)
      if (scrollRef.current) scrollRef.current.scrollTop = 0
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [view, selectedDate])

  const totalNum = useMemo(() => parseMoneyInput(totalRaw), [totalRaw])
  const incentiveNum = useMemo(
    () => parseMoneyInputAllowZero(incentiveRaw),
    [incentiveRaw],
  )
  const salaryNum = useMemo(
    () => Math.max(0, totalNum - incentiveNum),
    [totalNum, incentiveNum],
  )
  const isToday = selectedDate != null && selectedDate === todayDateKey()
  const canSubmit =
    selectedDate != null &&
    companyName.trim().length > 0 &&
    totalNum > 0 &&
    incentiveNum <= totalNum

  const closeImmediate = useCallback(() => {
    resetWageForm()
    resetNav()
    setSheetVisible(false)
    onClose()
  }, [onClose, resetWageForm, resetNav])

  const closeAnimated = useCallback(() => {
    setSheetVisible(false)
    window.setTimeout(() => {
      onClose()
      resetWageForm()
      resetNav()
    }, 320)
  }, [onClose, resetWageForm, resetNav])

  const handleSubmitWage = useCallback(() => {
    if (!selectedDate || !canSubmit) return
    addWorkLog(
      selectedDate,
      companyName.trim(),
      salaryNum,
      incentiveNum,
      isOvertime,
    )
    setView('overview')
  }, [
    selectedDate,
    canSubmit,
    addWorkLog,
    companyName,
    salaryNum,
    incentiveNum,
    isOvertime,
  ])

  const handleDeleteWage = useCallback(() => {
    if (!selectedDate || !hasExistingRecord) return
    if (!window.confirm('이 날의 근무 기록을 정말 삭제하시겠습니까?')) return
    deleteWageRecord(selectedDate)
    resetWageForm()
    setView('overview')
  }, [selectedDate, hasExistingRecord, deleteWageRecord, resetWageForm])

  const handleExerciseSubmit = useCallback(
    (payload: Parameters<typeof addExercise>[1]) => {
      if (!selectedDate) return
      if (editingExercise) {
        updateExercise(selectedDate, editingExercise.id, payload)
      } else {
        addExercise(selectedDate, payload)
      }
      setEditingExercise(null)
      setSelectedTemplate(null)
      setView('overview')
    },
    [selectedDate, editingExercise, addExercise, updateExercise],
  )

  const handleSaveMemo = useCallback(() => {
    if (!selectedDate) return
    updateMemo(selectedDate, memoDraft)
  }, [selectedDate, memoDraft, updateMemo])

  const viewHint =
    view === 'overview'
      ? '수입 · 운동 · 메모를 한곳에서 관리'
      : view === 'wage'
        ? '근무 정보 및 급여 입력'
        : view === 'exercise-pick'
          ? '운동 종류 선택'
          : '운동 기록 입력'

  if (!open && !sheetVisible) return null

  return (
    <Root $open={open}>
      <Backdrop type="button" aria-label="닫기" onClick={closeImmediate} />
      <SheetWrap onClick={(e) => e.stopPropagation()}>
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
                  <Hint>{viewHint}</Hint>
                </HeaderText>
                <CloseBtn
                  type="button"
                  aria-label="닫기"
                  onClick={closeImmediate}
                >
                  ×
                </CloseBtn>
              </HeaderRow>
            </HeaderBlock>
          )}

          <Scroll ref={scrollRef}>
            {view === 'overview' && selectedDate && (
              <>
                <SectionCard>
                  <SectionHead>
                    <SectionTitle>💰 수입</SectionTitle>
                  </SectionHead>
                  {hasExistingRecord && existingRecord ? (
                    <>
                      <DetailGrid>
                        <DetailKey>근무지</DetailKey>
                        <DetailVal>{existingRecord.title}</DetailVal>
                        <DetailKey>기본급</DetailKey>
                        <DetailVal>
                          {formatKRW(existingRecord.amount)}
                        </DetailVal>
                        <DetailKey>인센티브</DetailKey>
                        <DetailVal>
                          {formatKRW(existingRecord.incentive)}
                        </DetailVal>
                        <DetailKey>연장근무</DetailKey>
                        <DetailVal>
                          {existingRecord.isOvertime ? '✓' : '—'}
                        </DetailVal>
                        <DetailKey>총 금액</DetailKey>
                        <DetailVal>
                          {formatKRW(existingRecord.finalWage)}
                        </DetailVal>
                      </DetailGrid>
                      <div className="flex justify-end gap-1">
                        <DangerBtn type="button" onClick={handleDeleteWage}>
                          삭제
                        </DangerBtn>
                      </div>
                    </>
                  ) : (
                    <EmptyText>아직 기록된 수입이 없습니다.</EmptyText>
                  )}
                  {hasExistingRecord ? (
                    <AddBtn type="button" onClick={() => setView('wage')}>
                      [수입 수정]
                    </AddBtn>
                  ) : (
                    <AddBtn type="button" onClick={() => setView('wage')}>
                      [수입 추가]
                    </AddBtn>
                  )}
                </SectionCard>

                <SectionCard>
                  <SectionHead>
                    <SectionTitle>🏃 운동</SectionTitle>
                  </SectionHead>
                  {dayExercise.exercises.length > 0 ? (
                    <ExerciseList>
                      {dayExercise.exercises.map((ex) => (
                        <ListItem key={ex.id}>
                          <ListMeta>
                            <span className="text-sm font-bold text-gray-900">
                              {ex.completed ? '✓ ' : ''}
                              {ex.name}
                            </span>
                            <span className="text-xs font-bold text-indigo-700">
                              {formatExerciseSummary(ex)}
                            </span>
                          </ListMeta>
                          <div className="flex justify-end gap-1">
                            <GhostBtn
                              type="button"
                              onClick={() => {
                                setEditingExercise(ex)
                                setSelectedTemplate(null)
                                setView('exercise-form')
                              }}
                            >
                              수정
                            </GhostBtn>
                            <DangerBtn
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    '이 운동 기록을 삭제하시겠습니까?',
                                  )
                                ) {
                                  deleteExercise(selectedDate, ex.id)
                                }
                              }}
                            >
                              삭제
                            </DangerBtn>
                          </div>
                        </ListItem>
                      ))}
                    </ExerciseList>
                  ) : (
                    <EmptyText>아직 기록된 운동이 없습니다.</EmptyText>
                  )}
                  <AddBtn
                    type="button"
                    onClick={() => {
                      setEditingExercise(null)
                      setSelectedTemplate(null)
                      setView('exercise-pick')
                    }}
                  >
                    [운동 추가]
                  </AddBtn>
                </SectionCard>

                <SectionCard>
                  <SectionHead>
                    <SectionTitle>📝 오늘 메모</SectionTitle>
                  </SectionHead>
                  <MemoArea
                    value={memoDraft}
                    onChange={(e) => setMemoDraft(e.target.value)}
                    placeholder="컨디션, 특이사항 등을 적어 보세요"
                  />
                  <MemoSaveBtn type="button" onClick={handleSaveMemo}>
                    [메모 저장]
                  </MemoSaveBtn>
                </SectionCard>
              </>
            )}

            {view === 'wage' && (
              <>
                <BackBtn type="button" onClick={() => setView('overview')}>
                  ← 날짜 요약으로
                </BackBtn>
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
                    <FieldLabel>총 금액 (입금 받은 금액)</FieldLabel>
                    <Input
                      placeholder="실제로 입금된 총 금액 입력"
                      inputMode="numeric"
                      value={totalRaw}
                      onChange={(e) => setTotalRaw(e.target.value)}
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
                  <FieldGroup>
                    <FieldLabel>
                      급여 (기본급) <AutoHint>· 자동 계산</AutoHint>
                    </FieldLabel>
                    <Input
                      readOnly
                      disabled
                      aria-label="급여 (총 금액 - 인센티브)"
                      value={
                        totalNum > 0
                          ? String(salaryNum)
                          : ''
                      }
                      placeholder="총 금액 − 인센티브"
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>연장근무</FieldLabel>
                    <OvertimeToggle
                      type="button"
                      $on={isOvertime}
                      aria-pressed={isOvertime}
                      onClick={() => setIsOvertime((v) => !v)}
                    >
                      <OvertimeLabel>연장근무 했어요</OvertimeLabel>
                      <CheckBox $on={isOvertime} aria-hidden>
                        {isOvertime ? '✓' : ''}
                      </CheckBox>
                    </OvertimeToggle>
                  </FieldGroup>
                </FormPanel>
              </>
            )}

            {view === 'exercise-pick' && (
              <>
                <BackBtn type="button" onClick={() => setView('overview')}>
                  ← 날짜 요약으로
                </BackBtn>
                <SectionCard>
                  <SectionTitle>운동 선택</SectionTitle>
                  <TemplateList>
                    {exerciseTemplates.map((tpl) => (
                      <TemplateBtn
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplate(tpl)
                          setEditingExercise(null)
                          setView('exercise-form')
                        }}
                      >
                        {tpl.name}
                      </TemplateBtn>
                    ))}
                  </TemplateList>
                </SectionCard>
              </>
            )}

            {view === 'exercise-form' && (
              <>
                <BackBtn
                  type="button"
                  onClick={() =>
                    setView(editingExercise ? 'overview' : 'exercise-pick')
                  }
                >
                  ← 뒤로
                </BackBtn>
                <SectionCard>
                  <ExerciseEntryForm
                    template={selectedTemplate}
                    initialValues={editingExercise}
                    onSubmit={handleExerciseSubmit}
                    onCancel={() => {
                      setEditingExercise(null)
                      setSelectedTemplate(null)
                      setView('overview')
                    }}
                    submitLabel={editingExercise ? '수정 저장' : '저장'}
                  />
                </SectionCard>
              </>
            )}
          </Scroll>

          {view === 'wage' && (
            <StickyBottom>
              <FinalCombined>
                {isToday ? '오늘의 입금 금액' : '입금 금액'}
                {': '}
                {formatKRW(totalNum)}
              </FinalCombined>
              <ActionRow>
                <SubmitBtn
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmitWage}
                >
                  {hasExistingRecord ? '수정하기' : '+ 근무 등록하기'}
                </SubmitBtn>
              </ActionRow>
            </StickyBottom>
          )}

          {view === 'overview' && (
            <StickyBottom>
              <SubmitBtn type="button" onClick={closeAnimated}>
                닫기
              </SubmitBtn>
            </StickyBottom>
          )}
        </Sheet>
      </SheetWrap>
    </Root>
  )
}
