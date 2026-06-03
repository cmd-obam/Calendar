import styled from '@emotion/styled'
import {
  type FormEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  computeFinalDailyWage,
  useWageStore,
} from '../store/useWageStore'
import type { Template } from '../store/useWageStore'

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
  return Number.isFinite(v) ? v : 0
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

const TemplatePanel = styled.div`
  padding: 0.85rem 1rem 1rem;
  border-radius: 16px;
  background: var(--cal-muted, #f9fafb);
  border: 1px solid var(--cal-border, #e5e7eb);
`

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  position: relative;
`

const SectionTitleText = styled.span`
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--cal-text-dim, #6b7280);
`

const HelpAnchor = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`

const HelpButton = styled.button<{ $active: boolean }>`
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  border: none;
  background: ${({ $active }) =>
    $active ? 'var(--cal-accent-strong, #6366f1)' : 'var(--cal-muted-press, #e5e7eb)'};
  color: ${({ $active }) => ($active ? '#fff' : 'var(--cal-text-dim, #6b7280)')};
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;

  &:active {
    transform: scale(0.92);
  }
`

const Tooltip = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  min-width: 240px;
  max-width: 280px;
  padding: 0.75rem 0.85rem;
  background: var(--cal-text, #111827);
  color: #fff;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: -0.01em;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.3);
  pointer-events: none;
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  transition: opacity 0.18s ease, visibility 0.18s ease;
  z-index: 30;
  text-transform: none;

  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 10px;
    height: 10px;
    background: var(--cal-text, #111827);
    border-radius: 2px;
  }
`

const TooltipList = styled.ol`
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
`

const TooltipNotice = styled.p`
  margin: 0.55rem 0 0;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--cal-text-dim, #6b7280);
  text-align: center;
  line-height: 1.4;
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
  margin: 0 0 0.2rem;
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

const TemplateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const TemplateCard = styled.div<{ $active: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 12px 16px;
  border-radius: 10px;
  box-sizing: border-box;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(145deg, #4f46e5 0%, #6366f1 100%)'
      : 'var(--cal-surface, #fff)'};
  color: ${({ $active }) => ($active ? '#fff' : 'inherit')};
  border: 1px solid
    ${({ $active }) =>
      $active ? 'transparent' : 'var(--cal-border, #e5e7eb)'};
  box-shadow: ${({ $active }) =>
    $active
      ? '0 6px 20px rgba(79, 70, 229, 0.32)'
      : '0 1px 4px rgba(15, 23, 42, 0.06)'};
`

const TemplateCardSelect = styled.button`
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  color: inherit;

  &:active {
    opacity: 0.92;
  }
`

const TemplateInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const TemplateTitle = styled.span<{ $active: boolean }>`
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: ${({ $active }) =>
    $active ? '#fff' : 'var(--cal-text, #111827)'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TemplateMeta = styled.span<{ $active: boolean }>`
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: ${({ $active }) =>
    $active
      ? 'rgba(255, 255, 255, 0.88)'
      : 'var(--cal-accent-strong, #4338ca)'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TemplateCardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 0.25rem;
`

const TemplateIconBtn = styled.button<{ $onDark: boolean }>`
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: ${({ $onDark }) =>
    $onDark ? 'rgba(255, 255, 255, 0.22)' : 'var(--cal-muted, #f3f4f6)'};
  color: ${({ $onDark }) => ($onDark ? '#fff' : 'var(--cal-text, #111827)')};

  &:active {
    transform: scale(0.94);
  }
`

const PickPromptInner = styled.div`
  padding: 1rem 0.85rem;
  border-radius: 12px;
  background: var(--cal-surface, #fff);
  border: 1px dashed var(--cal-border, #d1d5db);
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--cal-text-dim, #6b7280);
  text-align: center;
  line-height: 1.45;
`

const IncentiveCard = styled.div`
  padding: 1rem 1.05rem;
  border-radius: 16px;
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
  border: 1px solid var(--cal-border, #e5e7eb);
`

const IncentiveLabel = styled.p`
  margin: 0 0 0.55rem;
  font-size: 0.78rem;
  font-weight: 900;
  color: var(--cal-text, #111827);
  letter-spacing: -0.01em;
`

const IncentiveHint = styled.p`
  margin: 0.55rem 0 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--cal-text-dim, #6b7280);
  line-height: 1.5;
`

const SelectedSummary = styled.div`
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: var(--cal-accent-soft, #eef2ff);
  border: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
`

const SelectedKey = styled.span`
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--cal-accent-strong, #4338ca);
`

const SelectedVal = styled.span`
  font-size: 0.92rem;
  font-weight: 900;
  color: var(--cal-text, #111827);
  text-align: right;
  word-break: keep-all;
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

  &:disabled {
    background: var(--cal-muted, #f3f4f6);
    color: var(--cal-text-dim, #9ca3af);
    cursor: not-allowed;
  }
`

const AddTemplateBlock = styled.div<{ $focused?: boolean }>`
  flex-shrink: 0;
  padding: ${({ $focused }) =>
    $focused ? '0.75rem 1.1rem 1.1rem' : '0.5rem 1.1rem 0.25rem'};
  padding-bottom: calc(
    ${({ $focused }) => ($focused ? '1.1rem' : '0.25rem')} +
      env(safe-area-inset-bottom, 0)
  );
  border-top: ${({ $focused }) =>
    $focused ? 'none' : '1px solid var(--cal-border, #f3f4f6)'};
  overflow: visible;
  position: relative;
  z-index: 2;
  ${({ $focused }) =>
    $focused &&
    `
    flex: 1;
    display: flex;
    flex-direction: column;
  `}
`

const ToggleBtn = styled.button<{ $open: boolean }>`
  width: 100%;
  padding: 0.95rem 1rem;
  border-radius: 14px;
  border: 2px dashed
    ${({ $open }) =>
      $open ? 'var(--cal-accent-strong, #6366f1)' : 'var(--cal-border, #d1d5db)'};
  background: ${({ $open }) =>
    $open ? 'var(--cal-accent-soft, #eef2ff)' : 'var(--cal-muted, #fafafa)'};
  font-size: 0.9rem;
  font-weight: 900;
  color: ${({ $open }) =>
    $open ? 'var(--cal-accent-strong, #4338ca)' : 'var(--cal-text-dim, #6b7280)'};
  cursor: pointer;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 56px;

  &:active {
    transform: scale(0.995);
  }
`

const AccordionPanel = styled.div<{ $open: boolean; $focused?: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  flex-direction: column;
  flex: ${({ $open, $focused }) => ($open && $focused ? 1 : 'unset')};
  overflow: visible;
`

const AddForm = styled.form<{ $focused?: boolean }>`
  margin-top: 0.6rem;
  padding: 1rem;
  border-radius: 16px;
  background: var(--cal-muted, #f9fafb);
  border: 1px solid var(--cal-border, #e5e7eb);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: visible;
  ${({ $focused }) => $focused && 'flex: 1;'}
`

const SaveTplBtn = styled.button`
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  font-weight: 900;
  border: none;
  border-radius: 14px;
  background: var(--cal-accent-strong, #6366f1);
  color: #fff;
  cursor: pointer;
  touch-action: manipulation;
  min-height: 52px;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: scale(0.99);
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
  const templates = useWageStore((s) => s.templates)
  const workLogs = useWageStore((s) => s.workLogs)
  const selectedDate = useWageStore((s) => s.selectedDate)
  const selectedTemplateId = useWageStore((s) => s.selectedTemplateId)
  const setSelectedTemplateId = useWageStore((s) => s.setSelectedTemplateId)
  const setAdditionalIncentive = useWageStore((s) => s.setAdditionalIncentive)
  const resetEntryDraft = useWageStore((s) => s.resetEntryDraft)
  const addWorkLog = useWageStore((s) => s.addWorkLog)
  const deleteWageRecord = useWageStore((s) => s.deleteWageRecord)
  const addTemplate = useWageStore((s) => s.addTemplate)
  const updateTemplate = useWageStore((s) => s.updateTemplate)
  const deleteTemplate = useWageStore((s) => s.deleteTemplate)

  const existingRecord = useMemo(
    () => (selectedDate ? workLogs[selectedDate] : undefined),
    [selectedDate, workLogs],
  )
  const hasExistingRecord = existingRecord != null

  const [sheetVisible, setSheetVisible] = useState(false)
  const [incentiveRaw, setIncentiveRaw] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  )
  const [helpOpen, setHelpOpen] = useState(false)
  const helpRef = useRef<HTMLDivElement | null>(null)

  /** 선택된 날짜·기록 여부에 따라 입력 초안 동기화 */
  useEffect(() => {
    if (!open || !selectedDate) return
    const record = workLogs[selectedDate]
    if (record) {
      const tid = record.templateId
      const validTpl =
        tid && templates.some((t) => t.id === tid) ? tid : null
      setSelectedTemplateId(validTpl)
      const inc = record.incentive || 0
      setAdditionalIncentive(inc)
      setIncentiveRaw(inc > 0 ? String(inc) : '')
    } else {
      resetEntryDraft()
      setIncentiveRaw('')
    }
  }, [
    open,
    selectedDate,
    workLogs,
    templates,
    setSelectedTemplateId,
    setAdditionalIncentive,
    resetEntryDraft,
  ])

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

  useEffect(() => {
    if (!helpOpen) return
    const onDocClick = (e: Event) => {
      if (!helpRef.current) return
      if (!helpRef.current.contains(e.target as Node)) setHelpOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('touchstart', onDocClick, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('touchstart', onDocClick)
    }
  }, [helpOpen])

  const resetTemplateForm = useCallback(() => {
    setEditingTemplateId(null)
    setNewTitle('')
    setNewAmount('')
  }, [])

  const fillTemplateForm = useCallback((t: Template) => {
    setNewTitle(t.title)
    setNewAmount(String(t.amount))
  }, [])

  const incNum = useMemo(() => parseMoneyInput(incentiveRaw), [incentiveRaw])
  const newAmountNum = useMemo(() => parseMoneyInput(newAmount), [newAmount])

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  )

  const finalPreview = useMemo(
    () => computeFinalDailyWage(selectedTemplate?.amount ?? 0, incNum),
    [selectedTemplate, incNum],
  )

  const isToday = selectedDate != null && selectedDate === todayDateKey()
  const canSubmit =
    selectedDate != null &&
    selectedTemplate != null &&
    Number.isFinite(finalPreview)

  const closeAnimated = useCallback(() => {
    setSheetVisible(false)
    window.setTimeout(() => {
      onClose()
      resetEntryDraft()
      resetTemplateForm()
      setAddOpen(false)
      setIncentiveRaw('')
      setHelpOpen(false)
    }, 320)
  }, [onClose, resetEntryDraft, resetTemplateForm])

  const closeImmediate = useCallback(() => {
    resetEntryDraft()
    resetTemplateForm()
    setAddOpen(false)
    setIncentiveRaw('')
    setHelpOpen(false)
    setSheetVisible(false)
    onClose()
  }, [onClose, resetEntryDraft, resetTemplateForm])

  const handleBackdrop = useCallback(() => {
    closeImmediate()
  }, [closeImmediate])

  const handleSelectTemplate = useCallback(
    (id: string) => {
      setSelectedTemplateId(id)
    },
    [setSelectedTemplateId],
  )

  const handleDeleteTemplate = useCallback(
    (e: MouseEvent, id: string) => {
      e.stopPropagation()
      deleteTemplate(id)
      if (editingTemplateId === id) {
        resetTemplateForm()
        setAddOpen(false)
      }
    },
    [deleteTemplate, editingTemplateId, resetTemplateForm],
  )

  const handleStartEditTemplate = useCallback(
    (e: MouseEvent, t: Template) => {
      e.stopPropagation()
      setEditingTemplateId(t.id)
      setAddOpen(true)
      fillTemplateForm(t)
    },
    [fillTemplateForm],
  )

  const handleIncentiveChange = useCallback(
    (raw: string) => {
      setIncentiveRaw(raw)
      setAdditionalIncentive(parseMoneyInput(raw))
    },
    [setAdditionalIncentive],
  )

  const handleTemplateFormSubmit = useCallback(
    (ev: FormEvent) => {
      ev.preventDefault()
      const title = newTitle.trim()
      const amount = parseMoneyInput(newAmount)
      if (!title || amount <= 0) return

      if (editingTemplateId) {
        updateTemplate(editingTemplateId, { title, amount })
        resetTemplateForm()
        setAddOpen(false)
        return
      }

      const added = addTemplate(title, amount)
      resetTemplateForm()
      setAddOpen(false)
      if (added) setSelectedTemplateId(added.id)
    },
    [
      addTemplate,
      updateTemplate,
      editingTemplateId,
      newTitle,
      newAmount,
      resetTemplateForm,
      setSelectedTemplateId,
    ],
  )

  const isEditingTemplate = editingTemplateId != null
  const isAddingTemplate = addOpen

  const handleSubmit = useCallback(() => {
    if (!selectedDate || !canSubmit || !selectedTemplate) return
    addWorkLog(
      selectedDate,
      selectedTemplate.id,
      selectedTemplate.title,
      selectedTemplate.amount,
      incNum,
    )
    closeAnimated()
  }, [
    selectedDate,
    canSubmit,
    selectedTemplate,
    addWorkLog,
    incNum,
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
    resetEntryDraft()
    setIncentiveRaw('')
    setAddOpen(false)
    resetTemplateForm()
    setHelpOpen(false)
  }, [
    selectedDate,
    hasExistingRecord,
    deleteWageRecord,
    resetEntryDraft,
    resetTemplateForm,
  ])

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
                  <DateHeadline id="cal-entry-date-title">
                    {formatKoreanTitleDate(selectedDate)}
                  </DateHeadline>
                  <Hint>
                    {isAddingTemplate
                      ? '제목과 실제 입금액을 입력한 뒤 템플릿을 저장하세요'
                      : hasExistingRecord
                        ? '템플릿 선택 → 인센티브 수정 → 저장'
                        : '템플릿 선택 → 인센티브 입력 → 저장'}
                  </Hint>
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

          {!isAddingTemplate && (
            <Scroll>
              <TemplatePanel>
                <SectionTitleRow>
                  <SectionTitleText>입력 가능 템플릿</SectionTitleText>
                  <HelpAnchor ref={helpRef}>
                    <HelpButton
                      type="button"
                      $active={helpOpen}
                      aria-label="템플릿 도움말"
                      aria-expanded={helpOpen}
                      onClick={() => setHelpOpen((v) => !v)}
                      onMouseEnter={() => setHelpOpen(true)}
                      onMouseLeave={() => setHelpOpen(false)}
                    >
                      ?
                    </HelpButton>
                    <Tooltip $open={helpOpen} role="tooltip">
                      <TooltipList>
                        <li>기본 일급 혹은 공휴일, 특근 수당을 입력한다.</li>
                        <li>
                          템플릿을 저장하고 해당 템플릿을 선택 후 하단에
                          인센티브 금액을 입력한다.
                        </li>
                        <li>저장하기를 누르면 해당 일에 기록된다.</li>
                      </TooltipList>
                    </Tooltip>
                  </HelpAnchor>
                </SectionTitleRow>
                {templates.length > 0 ? (
                  <>
                    <TemplateList>
                      {templates.map((t) => {
                        const active = selectedTemplateId === t.id
                        return (
                          <TemplateCard key={t.id} $active={active}>
                            <TemplateCardSelect
                              type="button"
                              onClick={() => handleSelectTemplate(t.id)}
                            >
                              <TemplateInfo>
                                <TemplateTitle $active={active}>
                                  {t.title}
                                </TemplateTitle>
                                <TemplateMeta $active={active}>
                                  {formatKRW(t.amount)}
                                </TemplateMeta>
                              </TemplateInfo>
                            </TemplateCardSelect>
                            <TemplateCardActions>
                              <TemplateIconBtn
                                type="button"
                                $onDark={active}
                                aria-label={`${t.title} 템플릿 수정`}
                                onClick={(e) =>
                                  handleStartEditTemplate(e, t)
                                }
                              >
                                ✎
                              </TemplateIconBtn>
                              <TemplateIconBtn
                                type="button"
                                $onDark={active}
                                aria-label={`${t.title} 템플릿 삭제`}
                                onClick={(e) => handleDeleteTemplate(e, t.id)}
                              >
                                ×
                              </TemplateIconBtn>
                            </TemplateCardActions>
                          </TemplateCard>
                        )
                      })}
                    </TemplateList>
                    {!selectedTemplate && (
                      <TooltipNotice>
                        위 템플릿을 눌러 실제 입금액을 적용하세요.
                      </TooltipNotice>
                    )}
                  </>
                ) : (
                  <PickPromptInner>
                    등록된 템플릿이 없습니다.
                    <br />
                    아래 「+ 새 템플릿 등록」을 눌러 먼저 추가해 주세요.
                  </PickPromptInner>
                )}
              </TemplatePanel>

              {selectedTemplate && (
                <SelectedSummary>
                  <SelectedKey>선택된 템플릿</SelectedKey>
                  <SelectedVal>
                    {selectedTemplate.title} ·{' '}
                    {formatKRW(selectedTemplate.amount)}
                  </SelectedVal>
                </SelectedSummary>
              )}

              <IncentiveCard
                style={{
                  opacity: selectedTemplate ? 1 : 0.55,
                }}
              >
                <IncentiveLabel>인센티브 · 프로모션 수당</IncentiveLabel>
                <Input
                  placeholder="0"
                  inputMode="numeric"
                  disabled={!selectedTemplate}
                  value={incentiveRaw}
                  onChange={(e) => handleIncentiveChange(e.target.value)}
                />
                <IncentiveHint>
                  템플릿 입금액에 추가로 더할 금액만 입력하세요. (없으면
                  비워두기)
                </IncentiveHint>
              </IncentiveCard>
            </Scroll>
          )}

          <AddTemplateBlock $focused={isAddingTemplate}>
            <ToggleBtn
              type="button"
              $open={addOpen}
              onClick={() => {
                setAddOpen((v) => {
                  const next = !v
                  if (!next) resetTemplateForm()
                  return next
                })
              }}
            >
              <span>
                {isEditingTemplate ? '템플릿 수정' : '+ 새 템플릿 등록'}
              </span>
              <span aria-hidden>{addOpen ? '▲' : '▼'}</span>
            </ToggleBtn>
            <AccordionPanel $open={addOpen} $focused={isAddingTemplate}>
              <AddForm
                $focused={isAddingTemplate}
                onSubmit={handleTemplateFormSubmit}
              >
                <div>
                  <FieldLabel>제목</FieldLabel>
                  <Input
                    placeholder="예: 쿠팡 공휴일"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    enterKeyHint="next"
                  />
                </div>
                <div>
                  <FieldLabel>실제 입금액 (원)</FieldLabel>
                  <Input
                    placeholder="135404"
                    inputMode="numeric"
                    enterKeyHint="done"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>
                <SaveTplBtn
                  type="submit"
                  disabled={!newTitle.trim() || newAmountNum <= 0}
                >
                  {isEditingTemplate ? '템플릿 수정 완료' : '템플릿 저장'}
                </SaveTplBtn>
              </AddForm>
            </AccordionPanel>
          </AddTemplateBlock>

          {!isAddingTemplate && (
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
          )}
        </Sheet>
      </SheetWrap>
    </Root>
  )
}
