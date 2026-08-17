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
