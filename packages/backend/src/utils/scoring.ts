/**
 * Dynamic Solve Points Calculator (Tiered Solve Order & Rank-Based Scoring)
 * 
 * Rules:
 * - 1st Solve (Hit 1 / First Blood): Base Points + FB 1st Bonus (default +50)
 * - 2nd Solve (Hit 2 / Second Blood): Base Points + FB 2nd Bonus (default +25)
 * - 3rd Solve (Hit 3 / Third Blood): Base Points + FB 3rd Bonus (default +10)
 * - 4th Solve (Hit 4): Base Points (Standard)
 * - 5th+ Solves (Hit 5, 6...): Decays by solve_decay_pts (default 5 PTS per rank down to min 70% base)
 */
export interface EventScoringRules {
  enable_fb_bonus?: boolean;
  fb_bonus_1st?: number;
  fb_bonus_2nd?: number;
  fb_bonus_3rd?: number;
  solve_decay_pts?: number;
}

export const calculateSolvePoints = (
  basePoints: number,
  solveRank: number,
  rules?: EventScoringRules
): {
  totalPoints: number;
  bonusPoints: number;
  isFirstBlood: boolean;
  solveRank: number;
} => {
  if (rules && rules.enable_fb_bonus === false) {
    return {
      totalPoints: basePoints,
      bonusPoints: 0,
      isFirstBlood: solveRank === 1,
      solveRank
    };
  }

  const bonus1st = rules?.fb_bonus_1st !== undefined ? rules.fb_bonus_1st : 50;
  const bonus2nd = rules?.fb_bonus_2nd !== undefined ? rules.fb_bonus_2nd : 25;
  const bonus3rd = rules?.fb_bonus_3rd !== undefined ? rules.fb_bonus_3rd : 10;
  const decayStep = rules?.solve_decay_pts !== undefined ? rules.solve_decay_pts : 5;

  let bonus = 0;
  if (solveRank === 1) {
    bonus = bonus1st;
  } else if (solveRank === 2) {
    bonus = bonus2nd;
  } else if (solveRank === 3) {
    bonus = bonus3rd;
  } else if (solveRank === 4) {
    bonus = 0;
  } else {
    if (decayStep > 0) {
      const maxDecay = Math.min(Math.round(basePoints * 0.3), (solveRank - 4) * decayStep);
      bonus = -maxDecay;
    } else {
      bonus = 0;
    }
  }

  const totalPoints = Math.max(Math.round(basePoints * 0.5), basePoints + bonus);

  return {
    totalPoints,
    bonusPoints: bonus,
    isFirstBlood: solveRank === 1,
    solveRank
  };
};

/**
 * Largest Remainder Method (Hamilton-Hare Algorithm)
 * Computes integer percentages that are guaranteed to sum to exactly targetSum (100%),
 * eliminating roundoff discrepancies such as 101% or 99%.
 */
export const calculateLargestRemainderPercentages = (
  values: number[],
  targetSum: number = 100
): number[] => {
  if (values.length === 0) return [];
  const positiveValues = values.map((v) => Math.max(0, v || 0));
  const total = positiveValues.reduce((sum, v) => sum + v, 0);

  if (total <= 0) {
    const equalShare = Math.floor(targetSum / values.length);
    const rem = targetSum - equalShare * values.length;
    return values.map((_, i) => equalShare + (i < rem ? 1 : 0));
  }

  const raw = positiveValues.map((v) => (v / total) * targetSum);
  const floors = raw.map(Math.floor);
  const currentSum = floors.reduce((a, b) => a + b, 0);
  const remainderNeeded = targetSum - currentSum;

  const remainders = raw
    .map((r, index) => ({
      index,
      remainder: r - floors[index]
    }))
    .sort((a, b) => b.remainder - a.remainder);

  const result = [...floors];
  for (let i = 0; i < remainderNeeded && i < remainders.length; i++) {
    result[remainders[i].index]++;
  }

  return result;
};
