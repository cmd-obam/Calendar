import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LATEST_NOTICE_ALERT_DETAIL,
  LATEST_NOTICE_BANNER_MESSAGE,
  WELCOME_BANNER_MESSAGE,
} from '../data/notices'

const TRANSITION_MS = 700
const HOLD_MS = 4000

type SlidePhase = 'enter' | 'hold' | 'exit'
type SlideVisual = 'wait' | 'active' | 'exit' | 'wait-snap'

const BANNER_SLIDES = [
  {
    id: 'welcome',
    message: WELCOME_BANNER_MESSAGE,
    clickable: false,
  },
  {
    id: 'notice',
    message: LATEST_NOTICE_BANNER_MESSAGE,
    clickable: true,
  },
] as const

const SLIDE_MOTION =
  'transition-[transform,opacity] duration-700 ease-in-out will-change-transform'

function visualClass(visual: SlideVisual): string {
  switch (visual) {
    case 'wait':
      return `${SLIDE_MOTION} translate-x-full opacity-0`
    case 'wait-snap':
      return 'translate-x-full opacity-0 transition-none'
    case 'active':
      return `${SLIDE_MOTION} translate-x-0 opacity-100`
    case 'exit':
      return `${SLIDE_MOTION} -translate-x-full opacity-0`
  }
}

function resolveVisual(
  slideIndex: number,
  activeIndex: number,
  phase: SlidePhase,
  snapIndex: number | null,
): SlideVisual {
  if (snapIndex === slideIndex) return 'wait-snap'
  if (slideIndex !== activeIndex) return 'wait'
  switch (phase) {
    case 'enter':
      return 'wait'
    case 'hold':
      return 'active'
    case 'exit':
      return 'exit'
  }
}

function nextIndex(current: number): number {
  return (current + 1) % BANNER_SLIDES.length
}

export interface TopAppBarProps {
  onOpenSettings: () => void
}

export default function TopAppBar({ onOpenSettings }: TopAppBarProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [phase, setPhase] = useState<SlidePhase>('enter')
  const [snapIndex, setSnapIndex] = useState<number | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms)
      })

    const waitPaint = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })

    const runCycle = async () => {
      let index = 0

      setActiveIndex(index)
      setSnapIndex(null)
      setPhase('enter')
      await waitPaint()

      if (cancelledRef.current) return
      setPhase('hold')
      await sleep(HOLD_MS)

      while (!cancelledRef.current) {
        setPhase('exit')
        await sleep(TRANSITION_MS)

        if (cancelledRef.current) return

        const prev = index
        const next = nextIndex(prev)

        setSnapIndex(prev)
        setActiveIndex(next)
        setPhase('enter')
        await waitPaint()

        if (cancelledRef.current) return
        setSnapIndex(null)
        setPhase('hold')
        await sleep(HOLD_MS)

        index = next
      }
    }

    void runCycle()

    return () => {
      cancelledRef.current = true
    }
  }, [])

  const isNoticeInteractive =
    activeIndex === 1 && phase === 'hold' && BANNER_SLIDES[1].clickable

  const handleNoticeClick = useCallback(() => {
    if (!isNoticeInteractive) return
    window.alert(LATEST_NOTICE_ALERT_DETAIL)
  }, [isNoticeInteractive])

  return (
    <header
      className="w-full min-w-0 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18),0_4px_12px_-4px_rgba(15,23,42,0.08)]"
      aria-label="앱 상단 바"
    >
      <div className="flex min-w-0 items-center gap-2 overflow-hidden px-3 py-2.5">
        <div
          className="relative h-9 min-w-0 flex-1 overflow-hidden"
          aria-live="polite"
        >
          <div className="relative flex h-9 w-full items-center justify-center overflow-hidden">
            {BANNER_SLIDES.map((slide, index) => {
              const visual = resolveVisual(index, activeIndex, phase, snapIndex)
              const isActiveSlide = index === activeIndex
              const className = `absolute max-w-none whitespace-nowrap px-1 text-xs font-semibold leading-snug text-gray-700 ${visualClass(visual)} ${
                isActiveSlide && isNoticeInteractive
                  ? 'cursor-pointer rounded-md active:bg-gray-100'
                  : 'pointer-events-none'
              }`

              if (slide.clickable) {
                return (
                  <button
                    key={slide.id}
                    type="button"
                    disabled={!isNoticeInteractive}
                    className={className}
                    onClick={handleNoticeClick}
                    aria-hidden={!isActiveSlide || phase !== 'hold'}
                    aria-label={
                      isNoticeInteractive
                        ? `최신 공지: ${slide.message}. 탭하여 전체 보기`
                        : undefined
                    }
                  >
                    {slide.message}
                  </button>
                )
              }

              return (
                <span
                  key={slide.id}
                  className={className}
                  aria-hidden={!isActiveSlide || phase !== 'hold'}
                >
                  {slide.message}
                </span>
              )
            })}
          </div>
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
