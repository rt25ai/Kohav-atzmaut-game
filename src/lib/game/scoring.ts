type QuestionScoreInput = {
  isCorrect: boolean;
  skipped: boolean;
  responseMs: number;
  previousStreak: number;
};

export type QuestionScoreBreakdown = {
  points: number;
  nextStreak: number;
  speedBonus: number;
  comboBonus: number;
  label: "correct" | "wrong" | "skipped";
};

export function calculateQuestionScore({
  isCorrect,
  skipped,
  responseMs,
  previousStreak,
}: QuestionScoreInput): QuestionScoreBreakdown {
  if (skipped) {
    return {
      points: 0,
      nextStreak: 0,
      speedBonus: 0,
      comboBonus: 0,
      label: "skipped",
    };
  }

  if (!isCorrect) {
    return {
      points: 15,
      nextStreak: 0,
      speedBonus: 0,
      comboBonus: 0,
      label: "wrong",
    };
  }

  const seconds = responseMs / 1000;
  const speedBonus = seconds <= 5 ? 25 : seconds <= 10 ? 10 : 0;
  const nextStreak = previousStreak + 1;
  const comboBonus = nextStreak === 5 ? 80 : nextStreak === 3 ? 40 : 0;
  const points = 100 + speedBonus + comboBonus;

  return {
    points,
    nextStreak,
    speedBonus,
    comboBonus,
    label: "correct",
  };
}

export function calculateMissionScore(points: number, skipped: boolean) {
  return skipped ? 0 : points;
}
