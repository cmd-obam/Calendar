import styled from '@emotion/styled'
import { useCallback, useEffect, useState } from 'react'
import { LATEST_NOTICE_ALERT_DETAIL } from '../data/notices'

type ExpandedSection = null | 'terms' | 'privacy' | 'general'

const TERMS_PLACEHOLDER = `제1조 (목적)
본 약관은 급여 캘린더 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리·의무를 규정함을 목적으로 합니다.

제2조 (서비스의 제공)
① 회사는 근무 일정 및 급여 기록 관리 기능을 제공합니다.
② 서비스 내용은 운영상 필요에 따라 변경될 수 있습니다.

제3조 (이용자의 의무)
이용자는 관련 법령 및 본 약관을 준수하여 서비스를 이용하여야 합니다.

(임시 약관 본문 — 추후 정식 문구로 교체 예정)`

const PRIVACY_PLACEHOLDER = `개인정보처리방침 (임시 안내)

1. 수집 항목
- 이메일 주소(선택): 공지·고객 지원 연락 시
- 디바이스 토큰(FCM 등): 푸시 알림 발송을 위한 기기 식별

2. 이용 목적
- 서비스 운영 및 푸시 알림 전달
- 문의 응대 및 공지사항 안내

3. 보관 및 파기
수집 목적 달성 후 지체 없이 파기하며, 관련 법령에 따른 보관이 필요한 경우 해당 기간 동안 보관합니다.

4. 이용자 권리
이용자는 언제든지 알림 설정을 해제하거나 문의를 통해 삭제를 요청할 수 있습니다.

(임시 안내 — 추후 정식 방침으로 교체 예정)`

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
  flex: 1;
  min-height: 0;
`

const ListItem = styled.li`
  margin: 0 0 0.25rem;
`

const ListButton = styled.button<{ $expanded?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.85rem 0.75rem;
  border: none;
  border-radius: 14px;
  background: ${({ $expanded }) =>
    $expanded ? 'var(--cal-accent-soft, #eef2ff)' : 'transparent'};
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

const Chevron = styled.span<{ $expanded?: boolean }>`
  flex-shrink: 0;
  font-size: 1rem;
  font-weight: 900;
  color: var(--cal-text-dim, #9ca3af);
  line-height: 1;
  transform: rotate(${({ $expanded }) => ($expanded ? '90deg' : '0')});
  transition: transform 0.2s ease;
`

const SubPanel = styled.div`
  margin: 0 0.35rem 0.5rem;
  padding: 0.75rem 0.85rem;
  max-height: 10rem;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 12px;
  background: var(--cal-muted, #f9fafb);
  border: 1px solid var(--cal-border, #e5e7eb);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.55;
  color: var(--cal-text-dim, #4b5563);
  white-space: pre-wrap;
  word-break: break-word;
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
  const [expanded, setExpanded] = useState<ExpandedSection>(null)
  const [isNotificationOn, setIsNotificationOn] = useState(true)

  useEffect(() => {
    if (!open) {
      const id = requestAnimationFrame(() => {
        setVisible(false)
        setExpanded(null)
      })
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

  const toggleSection = useCallback((section: ExpandedSection) => {
    setExpanded((cur) => (cur === section ? null : section))
  }, [])

  const handleNoticeClick = useCallback(() => {
    window.alert(LATEST_NOTICE_ALERT_DETAIL)
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
            <ListItem>
              <ListButton type="button" onClick={handleNoticeClick}>
                <ItemIcon aria-hidden>📢</ItemIcon>
                <ItemLabel>공지사항</ItemLabel>
                <Chevron aria-hidden>›</Chevron>
              </ListButton>
            </ListItem>

            <ListItem>
              <ListButton
                type="button"
                $expanded={expanded === 'terms'}
                onClick={() => toggleSection('terms')}
                aria-expanded={expanded === 'terms'}
              >
                <ItemIcon aria-hidden>📜</ItemIcon>
                <ItemLabel>이용약관</ItemLabel>
                <Chevron $expanded={expanded === 'terms'} aria-hidden>
                  ›
                </Chevron>
              </ListButton>
              {expanded === 'terms' && (
                <SubPanel>{TERMS_PLACEHOLDER}</SubPanel>
              )}
            </ListItem>

            <ListItem>
              <ListButton
                type="button"
                $expanded={expanded === 'privacy'}
                onClick={() => toggleSection('privacy')}
                aria-expanded={expanded === 'privacy'}
              >
                <ItemIcon aria-hidden>🔒</ItemIcon>
                <ItemLabel>개인정보처리방침</ItemLabel>
                <Chevron $expanded={expanded === 'privacy'} aria-hidden>
                  ›
                </Chevron>
              </ListButton>
              {expanded === 'privacy' && (
                <SubPanel>{PRIVACY_PLACEHOLDER}</SubPanel>
              )}
            </ListItem>

            <ListItem>
              <ListButton
                type="button"
                $expanded={expanded === 'general'}
                onClick={() => toggleSection('general')}
                aria-expanded={expanded === 'general'}
              >
                <ItemIcon aria-hidden>⚙️</ItemIcon>
                <ItemLabel>일반 설정</ItemLabel>
                <Chevron $expanded={expanded === 'general'} aria-hidden>
                  ›
                </Chevron>
              </ListButton>
              {expanded === 'general' && (
                <div className="mx-1 mb-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="min-w-0 text-sm font-bold text-gray-800">
                      🔔 푸시 알림 설정
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isNotificationOn}
                      aria-label="푸시 알림"
                      onClick={() => setIsNotificationOn((v) => !v)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ease-in-out ${
                        isNotificationOn ? 'bg-indigo-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                          isNotificationOn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-snug text-gray-500">
                    {isNotificationOn
                      ? '알림이 켜져 있습니다.'
                      : '알림이 꺼져 있습니다.'}
                  </p>
                </div>
              )}
            </ListItem>
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
