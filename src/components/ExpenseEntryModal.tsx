import { useCallback, useEffect, useState } from 'react'
import { todayDateKey } from '../lib/expenseHistoryUtils'
import ExpenseEntryForm, { type ExpenseEntryDraft } from './ExpenseEntryForm'

export type { ExpenseEntryDraft } from './ExpenseEntryForm'

export interface ExpenseEntryModalProps {
  open: boolean
  onClose: () => void
  onSave: (entry: ExpenseEntryDraft) => void
}

export default function ExpenseEntryModal({
  open,
  onClose,
  onSave,
}: ExpenseEntryModalProps) {
  const [sheetVisible, setSheetVisible] = useState(false)

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

  const closeAnimated = useCallback(() => {
    setSheetVisible(false)
    window.setTimeout(() => {
      onClose()
    }, 320)
  }, [onClose])

  const closeImmediate = useCallback(() => {
    setSheetVisible(false)
    onClose()
  }, [onClose])

  const handleSave = useCallback(
    (entry: ExpenseEntryDraft) => {
      onSave(entry)
      closeAnimated()
    },
    [onSave, closeAnimated],
  )

  if (!open && !sheetVisible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] ${open ? 'visible' : 'invisible'} ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full border-none bg-slate-900/50 backdrop-blur-[3px]"
        aria-label="닫기"
        onClick={closeImmediate}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-[env(safe-area-inset-bottom,0px)]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-entry-title"
          className={`pointer-events-auto flex w-full max-w-[480px] max-h-[94dvh] flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-black/5 bg-white shadow-[0_-12px_48px_rgba(15,23,42,0.24)] transition-transform duration-[340ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
            sheetVisible && open ? 'translate-y-0' : 'translate-y-[108%]'
          }`}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-[5px] w-11 rounded-full bg-gray-200" />
          </div>

          <div className="relative shrink-0 border-b border-gray-100 px-4 pb-4 pt-1">
            <h2
              id="expense-entry-title"
              className="text-center text-base font-black tracking-tight text-gray-900"
            >
              소비내역 추가
            </h2>
            <button
              type="button"
              className="absolute right-3 top-0 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xl font-light text-gray-700 transition active:scale-95 active:bg-gray-100"
              aria-label="닫기"
              onClick={closeImmediate}
            >
              ×
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
            {open && (
              <ExpenseEntryForm
                key={todayDateKey()}
                initialDate={todayDateKey()}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
