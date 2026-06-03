import styled from '@emotion/styled'
import { useCallback, useEffect, useState } from 'react'

const SETTINGS_ITEMS = [
  {
    id: 'notice',
    icon: '📢',
    label: '공지사항',
    alertMessage: '공지사항 메뉴입니다.',
  },
  {
    id: 'terms',
    icon: '📜',
    label: '이용약관',
    alertMessage: '이용약관 메뉴입니다.',
  },
  {
    id: 'privacy',
    icon: '🔒',
    label: '개인정보처리방침',
    alertMessage: '개인정보처리방침 메뉴입니다.',
  },
  {
    id: 'general',
    icon: '⚙️',
    label: '일반 설정',
    alertMessage: '일반 설정 메뉴입니다.',
  },
] as const

const Root = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1100;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
`

const Backdrop = styled.button`
  position: absolute;
  inset: 0;
  border: none;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(3px);
  cursor: pointer;
  touch-action: manipulation;
`

const CenterWrap = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding: 1.25rem;
  padding-left: max(1.25rem, env(safe-area-inset-left, 0));
  padding-right: max(1.25rem, env(safe-area-inset-right, 0));
`

const Panel = styled.div<{ $visible: boolean }>`
  pointer-events: auto;
  width: 100%;
  max-width: 28rem;
  max-height: min(85dvh, 100%);
  background: var(--cal-surface, #fff);
  color: var(--cal-text, #111827);
  border-radius: 20px;
  box-shadow:
    0 24px 64px rgba(15, 23, 42, 0.28),
    0 8px 24px rgba(15, 23, 42, 0.12);
  border: 1px solid var(--cal-border, rgba(15, 23, 42, 0.08));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: scale(${({ $visible }) => ($visible ? 1 : 0.96)});
  transition:
    opacity 0.28s ease,
    transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
`

const Head = styled.div`
  flex-shrink: 0;
  padding: 1rem 1.1rem 0.85rem;
  border-bottom: 1px solid var(--cal-border, #e5e7eb);
`

const Title = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: -0.03em;
`

const Sub = styled.p`
  margin: 0.35rem 0 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cal-text-dim, #6b7280);
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0.5rem 0.65rem 0.75rem;
  overflow-y: auto;
`

const ListItem = styled.li`
  margin: 0;
`

const ListButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.85rem 0.75rem;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.15s ease;

  &:active {
    background: var(--cal-muted, #f3f4f6);
  }
`

const ItemIcon = styled.span`
  flex-shrink: 0;
  font-size: 1.1rem;
  line-height: 1;
`

const ItemLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: -0.02em;
`

const Chevron = styled.span`
  flex-shrink: 0;
  font-size: 1rem;
  font-weight: 900;
  color: var(--cal-text-dim, #9ca3af);
  line-height: 1;
`

const CloseRow = styled.div`
  flex-shrink: 0;
  padding: 0.5rem 1rem 1rem;
  border-top: 1px solid var(--cal-border, #f3f4f6);
`

const CloseBtn = styled.button`
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 14px;
  background: var(--cal-muted, #f3f4f6);
  font-size: 0.9rem;
  font-weight: 900;
  color: var(--cal-text, #111827);
  cursor: pointer;
  touch-action: manipulation;

  &:active {
    background: var(--cal-muted-press, #e5e7eb);
  }
`

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!open) {
      const id = requestAnimationFrame(() => setVisible(false))
      return () => cancelAnimationFrame(id)
    }
    const id = requestAnimationFrame(() => setVisible(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = prev
    }
  }, [open])

  const handleBackdrop = useCallback(() => {
    setVisible(false)
    window.setTimeout(onClose, 280)
  }, [onClose])

  const handleItemClick = useCallback((message: string) => {
    window.alert(message)
  }, [])

  if (!open && !visible) return null

  return (
    <Root $open={open}>
      <Backdrop type="button" aria-label="닫기" onClick={handleBackdrop} />
      <CenterWrap
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <Panel
          $visible={visible && open}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
        >
          <Head>
            <Title id="settings-modal-title">설정</Title>
            <Sub>앱 정보 및 환경 설정</Sub>
          </Head>

          <List>
            {SETTINGS_ITEMS.map((item) => (
              <ListItem key={item.id}>
                <ListButton
                  type="button"
                  onClick={() => handleItemClick(item.alertMessage)}
                >
                  <ItemIcon aria-hidden>{item.icon}</ItemIcon>
                  <ItemLabel>{item.label}</ItemLabel>
                  <Chevron aria-hidden>›</Chevron>
                </ListButton>
              </ListItem>
            ))}
          </List>

          <CloseRow>
            <CloseBtn type="button" onClick={handleBackdrop}>
              닫기
            </CloseBtn>
          </CloseRow>
        </Panel>
      </CenterWrap>
    </Root>
  )
}
