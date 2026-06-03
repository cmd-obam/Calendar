import { useCallback, useMemo } from 'react'
import { getLatestNotice } from '../data/notices'

export interface TopAppBarProps {
  onOpenSettings: () => void
}

export default function TopAppBar({ onOpenSettings }: TopAppBarProps) {
  const latestNotice = useMemo(() => getLatestNotice(), [])

  const handleNoticeClick = useCallback(() => {
    if (!latestNotice) return
    window.alert(latestNotice.message)
  }, [latestNotice])

  return (
    <header
      className="w-full min-w-0 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18),0_4px_12px_-4px_rgba(15,23,42,0.08)]"
      aria-label="앱 상단 바"
    >
      <div className="flex min-w-0 items-center gap-2 px-3 py-2.5">
        <div className="relative min-h-9 min-w-0 flex-1 overflow-hidden">
          {latestNotice ? (
            <button
              type="button"
              className="animate-notice-marquee block w-max max-w-none touch-manipulation whitespace-nowrap rounded-md px-1 py-1 text-left text-xs font-semibold leading-snug text-gray-700 active:bg-gray-100"
              onClick={handleNoticeClick}
              aria-label={`최신 공지: ${latestNotice.message}. 탭하여 전체 보기`}
            >
              {latestNotice.message}
            </button>
          ) : (
            <span className="block py-1 text-xs font-semibold text-gray-400">
              공지 없음
            </span>
          )}
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
