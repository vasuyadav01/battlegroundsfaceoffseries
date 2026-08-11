/**
 * BGFS Scoring Logic
 * Standard BGIS-style placement points + kill points
 */

// Placement points lookup
export function getPlacementPoints(placement: number): number {
  if (placement === 1) return 10
  if (placement === 2) return 6
  if (placement === 3) return 5
  if (placement === 4) return 4
  if (placement === 5) return 3
  if (placement >= 6 && placement <= 10) return 2
  if (placement >= 11 && placement <= 15) return 1
  return 0 // 16th–24th
}

export function getKillPoints(kills: number): number {
  return kills // 1 point per kill
}

export function getTotalPoints(placement: number, kills: number): number {
  return getPlacementPoints(placement) + getKillPoints(kills)
}

/**
 * Best-16 calculation: sum of top 16 match scores
 */
export function calcBest16(scores: number[]): number {
  if (scores.length === 0) return 0
  const sorted = [...scores].sort((a, b) => b - a)
  return sorted.slice(0, 16).reduce((sum, s) => sum + s, 0)
}

/**
 * Slot prize structure (at 18 teams = ₹900 revenue)
 */
export const SLOT_PRIZES = {
  first: 170,   // ₹170 cash
  second: 100,  // ₹100 cash
  third: 'coupon', // 1 free slot coupon
} as const

export const ENTRY_FEE = 50 // ₹50 per slot
export const MAX_TEAMS_PER_SLOT = 24
export const TARGET_TEAMS_PER_SLOT = 18
export const BEST_N_MATCHES = 16
