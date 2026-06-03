export interface Notice {
  id: string
  message: string
}

/** 등록 순서대로 쌓이며, 전광판에는 마지막(최신) 항목만 표시 */
export const NOTICES: Notice[] = [
  {
    id: 'notice-1',
    message:
      '📢 [안내] 최신 업데이트: 근무지별 시급 설정 및 모바일 최적화 레이아웃이 적용되었습니다!',
  },
]

export function getLatestNotice(): Notice | undefined {
  if (NOTICES.length === 0) return undefined
  return NOTICES[NOTICES.length - 1]
}
