/** 원 단위 비음수 정수로 보정 (1원 단위 정확도) */
export function toWonInteger(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.floor(value)
}

/** 입력 문자열 → 원 단위 정수 */
export function parseWonInput(raw: string): number {
  const trimmed = raw.replace(/,/g, '').trim()
  if (!trimmed) return 0
  return toWonInteger(Number(trimmed))
}

/**
 * 수입 달성률 (%)
 * 월별 목표 금액이 0이면 0 (NaN·Infinity 방지)
 */
export function calcIncomeAchievementRatio(
  totalIncome: number,
  monthlyGoal: number,
): number {
  const income = toWonInteger(totalIncome)
  const goal = toWonInteger(monthlyGoal)
  if (goal <= 0) return 0
  const ratio = (income / goal) * 100
  return Number.isFinite(ratio) ? ratio : 0
}

/** 비율 표시 — 소수점 첫째 자리 */
export function formatRatioOneDecimal(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio < 0) return '0.0'
  return ratio.toFixed(1)
}

/** 게이지바 width용 — 0~100% 클램프 */
export function clampGaugePercent(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio < 0) return 0
  return Math.min(100, ratio)
}
