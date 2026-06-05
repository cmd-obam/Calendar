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

/**
 * 지출 비율 (%)
 * totalIncome이 0이면 0 (NaN·Infinity 방지)
 */
export function calcExpenseRatioPercent(
  totalExpense: number,
  totalIncome: number,
): number {
  const expense = toWonInteger(totalExpense)
  const income = toWonInteger(totalIncome)
  if (income <= 0) return 0
  const ratio = (expense / income) * 100
  return Number.isFinite(ratio) ? ratio : 0
}

/** 비율 표시 — 소수점 첫째 자리 */
export function formatRatioOneDecimal(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio < 0) return '0.0'
  return ratio.toFixed(1)
}

/**
 * 월별 목표 저축액 (원 단위 절사)
 * targetMonths가 0 이하면 0
 */
export function calcMonthlyTargetSavings(
  targetAmount: number,
  targetMonths: number,
): number {
  const amount = toWonInteger(targetAmount)
  const months = Math.floor(targetMonths)
  if (months <= 0 || amount <= 0) return 0
  return Math.floor(amount / months)
}

/** 이번 달 실제 저축액 = 수입 − 지출 (음수는 0) */
export function calcActualMonthlySavings(
  totalIncome: number,
  totalExpense: number,
): number {
  const income = toWonInteger(totalIncome)
  const expense = toWonInteger(totalExpense)
  return Math.max(0, income - expense)
}

/**
 * 당월 저축 달성률 (%)
 * 월별 목표 저축액이 0이면 0
 */
export function calcSavingsProgressRatio(
  actualSavings: number,
  monthlyTargetSavings: number,
): number {
  const actual = toWonInteger(actualSavings)
  const target = toWonInteger(monthlyTargetSavings)
  if (target <= 0) return 0
  const ratio = (actual / target) * 100
  return Number.isFinite(ratio) ? ratio : 0
}

/** 게이지바 width용 — 0~100% 클램프 */
export function clampGaugePercent(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio < 0) return 0
  return Math.min(100, ratio)
}
