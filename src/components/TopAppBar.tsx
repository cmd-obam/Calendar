import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LATEST_NOTICE_ALERT_DETAIL,
  LATEST_NOTICE_BANNER_MESSAGE,
  WELCOME_BANNER_MESSAGE,
} from '../data/notices'

const ENTER_MS = 520
const HOLD_MS = 4000
const EXIT_MS = 520

type BannerStep = 'welcome' | 'notice'
type SlideMotion = 'off-right' | 'center' | 'off-left'

function messageForStep(step: BannerStep): string {
  return step === 'welcome' ? WELCOME_BANNER_MESSAGE : LATEST_NOTICE_BANNER_MESSAGE
}

function slidePositionClass(motion: SlideMotion): string {
  switch (motion) {
    case 'off-right':
      return 'left-full translate-x-0'
    case 'center':
      return 'left-1/2 -translate-x-1/2'
    case 'off-left':
      return 'left-0 -translate-x-full'
  }
}

export interface TopAppBarProps {
  onOpenSettings: () => void
}

export default function TopAppBar({ onOpenSettings }: TopAppBarProps) {
  const [step, setStep] = useState<BannerStep>('welcome')
  const [motion, setMotion] = useState<SlideMotion>('off-right')
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms)
      })

    const runCycle = async () => {
      let currentStep: BannerStep = 'welcome'

      while (!cancelledRef.current) {
        setStep(currentStep)
        setMotion('off-right')
        await sleep(32)

        if (cancelledRef.current) return
        setMotion('center')
        await sleep(ENTER_MS + HOLD_MS)

        if (cancelledRef.current) return
        setMotion('off-left')
        await sleep(EXIT_MS)

        currentStep = currentStep === 'welcome' ? 'notice' : 'welcome'
      }
    }

    void runCycle()

    return () => {
      cancelledRef.current = true
    }
  }, [])

  const isNoticeInteractive = step === 'notice' && motion === 'center'

  const handleBannerClick = useCallback(() => {
    if (!isNoticeInteractive) return
    window.alert(LATEST_NOTICE_ALERT_DETAIL)
  }, [isNoticeInteractive])

  return (
    <header
      className="w-full min-w-0 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18),0_4px_12px_-4px_rgba(15,23,42,0.08)]"
      aria-label="앱 상단 바"
    >
      <div className="flex min-w-0 items-center gap-2 overflow-hidden px-3 py-2.5">
        <div className="relative h-9 min-w-0 flex-1 overflow-hidden">
          <button
            type="button"
            disabled={!isNoticeInteractive}
            className={`absolute top-1/2 -translate-y-1/2 max-w-none whitespace-nowrap px-1 py-1 text-xs font-semibold leading-snug transition-[left,transform] duration-500 ease-in-out ${slidePositionClass(motion)} ${
              isNoticeInteractive
                ? 'cursor-pointer rounded-md text-gray-700 active:bg-gray-100'
                : 'pointer-events-none cursor-default text-gray-700'
            }`}
            onClick={handleBannerClick}
            aria-live="polite"
            aria-label={
              isNoticeInteractive
                ? `최신 공지: ${LATEST_NOTICE_BANNER_MESSAGE}. 탭하여 전체 보기`
                : messageForStep(step)
            }
          >
            {messageForStep(step)}
          </button>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-lg leading-none text-gray-700 transition active:scale-95 active:bg-gray-100"
          aria-label="설정 열기"
          onClick={onOpenSettings}
        >
          ⚙️
        </button>
      </div>
    </header>
  )
}
