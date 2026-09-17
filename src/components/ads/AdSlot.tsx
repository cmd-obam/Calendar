import styled from '@emotion/styled'

export type AdPlacement = 'top' | 'bottom' | 'side'

export interface AdSlotProps {
  placement: AdPlacement
  /** false면 플레이스홀더를 렌더하지 않음(레이아웃 빈 공간 없음) */
  enabled?: boolean
  label?: string
}

const Slot = styled.div<{ $placement: AdPlacement }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  border: 1px dashed rgba(99, 102, 241, 0.35);
  border-radius: 12px;
  background: rgba(238, 242, 255, 0.65);
  color: #6366f1;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-align: center;
  user-select: none;
  pointer-events: none;

  ${({ $placement }) => {
    if ($placement === 'top') {
      return `
        min-height: 50px;
        max-height: 60px;
        margin: 0 0 0.65rem;
        padding: 0.45rem 0.75rem;
      `
    }
    if ($placement === 'bottom') {
      return `
        min-height: 50px;
        max-height: 60px;
        margin: 0.65rem 0 0;
        padding: 0.45rem 0.75rem;
      `
    }
    return `
      min-height: 250px;
      width: 100%;
      max-width: 160px;
      padding: 0.75rem 0.5rem;
      writing-mode: horizontal-tb;
    `
  }}
`

const Caption = styled.span`
  opacity: 0.9;
`

/**
 * Google 광고 연동 전용 자리.
 * 실제 광고 ID/SDK는 넣지 않으며, 레이아웃 검증용 플레이스홀더만 표시한다.
 */
export default function AdSlot({
  placement,
  enabled = true,
  label,
}: AdSlotProps) {
  if (!enabled) return null

  const text =
    label ??
    (placement === 'side'
      ? '광고 영역 (데스크톱)'
      : placement === 'top'
        ? '광고 영역 (상단)'
        : '광고 영역 (하단)')

  return (
    <Slot
      $placement={placement}
      role="presentation"
      aria-hidden
      data-ad-placement={placement}
    >
      <Caption>{text}</Caption>
    </Slot>
  )
}
