import styled from '@emotion/styled'

export type BottomNavTab = 'home' | 'report' | 'settings'

export interface BottomNavigationProps {
  active: BottomNavTab
  onChange: (tab: BottomNavTab) => void
}

const Nav = styled.nav`
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 800;
  width: 100%;
  max-width: 28rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.15rem;
  padding: 0.45rem 0.55rem calc(0.45rem + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
  box-sizing: border-box;

  @media (min-width: 1100px) {
    /* 데스크톱 중앙 컬럼(최대 ~28rem)에 맞춤 — shell padding 고려 */
    max-width: 28rem;
  }
`

const TabBtn = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  min-height: 3rem;
  border: none;
  border-radius: 12px;
  background: ${({ $active }) => ($active ? '#eef2ff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#4338ca' : '#6b7280')};
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  cursor: pointer;
  touch-action: manipulation;

  &:active {
    transform: scale(0.97);
  }
`

const TabIcon = styled.span`
  font-size: 1.05rem;
  line-height: 1;
`

export default function BottomNavigation({
  active,
  onChange,
}: BottomNavigationProps) {
  return (
    <Nav aria-label="하단 메뉴">
      <TabBtn
        type="button"
        $active={active === 'home'}
        aria-current={active === 'home' ? 'page' : undefined}
        onClick={() => onChange('home')}
      >
        <TabIcon aria-hidden>📅</TabIcon>
        캘린더
      </TabBtn>
      <TabBtn
        type="button"
        $active={active === 'report'}
        aria-current={active === 'report' ? 'page' : undefined}
        onClick={() => onChange('report')}
      >
        <TabIcon aria-hidden>📊</TabIcon>
        상세보기
      </TabBtn>
      <TabBtn
        type="button"
        $active={active === 'settings'}
        aria-current={active === 'settings' ? 'page' : undefined}
        onClick={() => onChange('settings')}
      >
        <TabIcon aria-hidden>⚙️</TabIcon>
        설정
      </TabBtn>
    </Nav>
  )
}
