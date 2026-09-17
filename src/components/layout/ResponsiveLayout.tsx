import styled from '@emotion/styled'
import type { ReactNode } from 'react'
import AdSlot from '../ads/AdSlot'

/** 개발/레이아웃 검증용. 실제 광고 SDK 연동 시 env로 제어 */
const SHOW_AD_PLACEHOLDERS =
  import.meta.env.VITE_SHOW_AD_PLACEHOLDERS !== 'false'

const Shell = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-content: center;
  width: 100%;
  min-height: 100dvh;
  min-height: 100svh;
  box-sizing: border-box;
  background: #eef2f6;
  padding:
    env(safe-area-inset-top, 0)
    env(safe-area-inset-right, 0)
    0
    env(safe-area-inset-left, 0);

  @media (min-width: 1100px) {
    grid-template-columns: 160px minmax(0, 28rem) 160px;
    gap: 1rem;
    align-items: start;
    padding: 1rem
      max(1rem, env(safe-area-inset-right, 0))
      1rem
      max(1rem, env(safe-area-inset-left, 0));
  }
`

const SideColumn = styled.aside`
  display: none;
  position: sticky;
  top: 1rem;
  justify-content: center;
  padding-top: 0.5rem;

  @media (min-width: 1100px) {
    display: flex;
  }
`

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 28rem;
  min-width: 0;
  margin: 0 auto;
  min-height: 100dvh;
  min-height: 100svh;
  box-sizing: border-box;

  @media (min-width: 1100px) {
    max-width: none;
    min-height: calc(100dvh - 2rem);
    border-radius: 16px;
    overflow: hidden;
    box-shadow:
      0 10px 40px -12px rgba(15, 23, 42, 0.18),
      0 4px 12px -4px rgba(15, 23, 42, 0.08);
    background: #f3f4f6;
  }
`

const Content = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  background: #f3f4f6;
  padding: 0.85rem 0.85rem 0.5rem;
  box-sizing: border-box;

  @media (min-width: 640px) {
    padding-left: 1rem;
    padding-right: 1rem;
  }
`

const TopAdWrap = styled.div`
  flex-shrink: 0;
  padding: 0.75rem 0.85rem 0;

  @media (min-width: 640px) {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  @media (min-width: 1100px) {
    background: #f3f4f6;
  }
`

const BottomAdWrap = styled.div`
  flex-shrink: 0;
  padding: 0 0.85rem;
  padding-bottom: calc(4.6rem + env(safe-area-inset-bottom, 0px));

  @media (min-width: 640px) {
    padding-left: 1rem;
    padding-right: 1rem;
  }
`

export interface ResponsiveLayoutProps {
  children: ReactNode
}

/**
 * 모바일 우선 셸.
 * - 모바일: 단일 컬럼 + 상/하단 광고 자리
 * - 데스크톱(≥1100px): 좌·우 광고 자리 + 중앙 콘텐츠
 * 광고가 꺼져도(placeholder off) 중앙 콘텐츠만으로 자연스럽게 유지된다.
 */
export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  return (
    <Shell>
      <SideColumn aria-hidden={!SHOW_AD_PLACEHOLDERS}>
        <AdSlot placement="side" enabled={SHOW_AD_PLACEHOLDERS} />
      </SideColumn>

      <MainColumn>
        <TopAdWrap>
          <AdSlot placement="top" enabled={SHOW_AD_PLACEHOLDERS} />
        </TopAdWrap>
        <Content aria-label="급여·운동 캘린더">{children}</Content>
        <BottomAdWrap>
          <AdSlot placement="bottom" enabled={SHOW_AD_PLACEHOLDERS} />
        </BottomAdWrap>
      </MainColumn>

      <SideColumn aria-hidden={!SHOW_AD_PLACEHOLDERS}>
        <AdSlot placement="side" enabled={SHOW_AD_PLACEHOLDERS} />
      </SideColumn>
    </Shell>
  )
}
