export type OptionId = "a" | "b" | "c" | "d";

export type ParticipantType = "solo_male" | "solo_female" | "family";

export type QuestionOption = {
  id: OptionId;
  label: string;
};

export type Question = {
  type: "mcq";
  id: string;
  title: string;
  prompt: string;
  options: QuestionOption[];
  correctOptionId: OptionId;
  correctOptionIndex: number;
  basePoints: number;
};

export type PhotoMission = {
  type: "photo";
  id: string;
  title: string;
  prompt: string;
  basePoints: number;
  isFinal?: boolean;
};

export type RunStep =
  | {
      kind: "question";
      questionId: string;
    }
  | {
      kind: "mission";
      missionId: string;
    };

export type PrizeLabels = {
  first: string;
  second: string;
  third: string;
};

export type AdminSettings = {
  introText: string;
  prizeLabels: PrizeLabels;
  globalSoundEnabled: boolean;
};

export type AdminSettingsPatch = {
  introText?: string;
  prizeLabels?: Partial<PrizeLabels>;
  globalSoundEnabled?: boolean;
};

export type PlayerRecord = {
  id: string;
  name: string;
  participantType: ParticipantType;
  questionOrder: string[];
  missionOrder: string[];
  currentStepIndex: number;
  totalScore: number;
  correctAnswers: number;
  photoMissionsCompleted: number;
  newPeopleMet: number;
  comboStreak: number;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  lastRank: number | null;
};

export type PlayerAnswerRecord = {
  id: string;
  playerId: string;
  kind: "question" | "mission";
  contentId: string;
  stepIndex: number;
  status: "correct" | "wrong" | "skipped" | "uploaded";
  answerOptionId: OptionId | null;
  responseMs: number | null;
  pointsAwarded: number;
  caption: string | null;
  photoUrl: string | null;
  thumbnailUrl: string | null;
  missionTitle: string | null;
  newPeopleMet: number;
  isFinalMission: boolean;
  createdAt: string;
};

export type PhotoUploadRecord = {
  id: string;
  playerId: string;
  playerName: string;
  missionId: string;
  missionTitle: string;
  caption: string | null;
  photoUrl: string;
  thumbnailUrl: string | null;
  hidden: boolean;
  createdAt: string;
  isFinalMission: boolean;
};

export type GameEventRecord = {
  id: string;
  type:
    | "player_joined"
    | "rank_up"
    | "photo_uploaded"
    | "score_update"
    | "game_completed"
    | "admin_update";
  message: string;
  playerId: string | null;
  playerName: string | null;
  createdAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  playerId: string;
  name: string;
  totalScore: number;
  correctAnswers: number;
  photoMissionsCompleted: number;
  newPeopleMet: number;
  completed: boolean;
  isActive: boolean;
};

export type GalleryEntry = {
  id: string;
  playerId: string;
  playerName: string;
  missionId: string;
  missionTitle: string;
  caption: string | null;
  photoUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
  isFinalMission: boolean;
};

export type PublicSnapshot = {
  settings: AdminSettings;
  totalParticipants: number;
  activePlayersNow: number;
  leaderboard: LeaderboardEntry[];
  latestPhotos: GalleryEntry[];
  recentEvents: GameEventRecord[];
};

export type SessionSnapshot = {
  player: PlayerRecord;
  settings: AdminSettings;
  steps: RunStep[];
  currentStep: RunStep | null;
  answers: PlayerAnswerRecord[];
  leaderboard: LeaderboardEntry[];
  questions: Question[];
  missions: PhotoMission[];
};

export type SurveyPlayerComparison =
  | "top-choice"
  | "minority"
  | "unique"
  | "skipped";

export type SurveyOptionResult = {
  optionId: OptionId;
  label: string;
  voteCount: number;
  percentage: number;
  isTopChoice: boolean;
  isPlayerChoice: boolean;
};

export type SurveyQuestionResult = {
  questionId: string;
  questionTitle: string;
  prompt: string;
  totalAnswered: number;
  totalResponses: number;
  skippedCount: number;
  playerChoiceOptionId: OptionId | null;
  playerComparison: SurveyPlayerComparison;
  topOptionIds: OptionId[];
  options: SurveyOptionResult[];
};

export type SurveyResultsSnapshot = {
  playerId: string;
  completed: boolean;
  questionResults: SurveyQuestionResult[];
};

export type SummarySnapshot = {
  player: PlayerRecord;
  rank: number;
  totalPlayers: number;
  settings: AdminSettings;
  leaderboard: LeaderboardEntry[];
  survey: SurveyResultsSnapshot;
};

export type AdminSnapshot = {
  settings: AdminSettings;
  players: PlayerRecord[];
  activePlayers: PlayerRecord[];
  leaderboard: LeaderboardEntry[];
  photos: PhotoUploadRecord[];
  totalParticipants: number;
};

export type LocalDatabase = {
  settings: AdminSettings;
  players: PlayerRecord[];
  answers: PlayerAnswerRecord[];
  photos: PhotoUploadRecord[];
  events: GameEventRecord[];
  questions: Question[];
  missions: PhotoMission[];
};

export type StartGameInput = {
  name: string;
  participantType: ParticipantType;
};

export type SubmitAnswerInput = {
  playerId: string;
  questionId: string;
  stepIndex: number;
  selectedOptionId: OptionId | null;
  responseMs: number;
  skipped: boolean;
};

export type SubmitMissionInput = {
  playerId: string;
  missionId: string;
  stepIndex: number;
  caption: string;
  newPeopleMet: number;
  skipped: boolean;
  photoUrl: string | null;
  thumbnailUrl: string | null;
};

export type SubmitExtraPhotoInput = {
  playerId: string;
  caption: string;
  photoUrl: string;
  thumbnailUrl: string | null;
};

export type AdjustPlayerPointsInput = {
  playerId: string;
  delta: number;
};

export type PhotoModerationInput = {
  photoId: string;
  action: "hide" | "delete" | "restore";
};
