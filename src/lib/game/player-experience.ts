import type { GalleryEntry, ParticipantType, RunStep } from "@/lib/types";

type ParticipantOptions<T> = {
  solo_male: T;
  solo_female: T;
  family: T;
};

export type ParticipantVoice = {
  startLabel: string;
  startingLabel: string;
  readyLine: string;
  continueLabel: string;
  skipLabel: string;
  choosePhotoLabel: string;
  replacePhotoLabel: string;
  submitMissionLabel: string;
  photoHint: string;
  photoCaptionLabel: string;
  photoCaptionPlaceholder: string;
  newPeopleMetLabel: string;
  returnHomeLabel: string;
};

export type StepProgress = {
  current: number;
  total: number;
};

export type GalleryGroup = {
  playerId: string;
  playerName: string;
  cover: GalleryEntry;
  photos: GalleryEntry[];
  latestCreatedAt: string;
};

const participantVoices: Record<ParticipantType, ParticipantVoice> = {
  solo_male: {
    startLabel: "התחל את הערב",
    startingLabel: "נכנס לשידור החי...",
    readyLine: "מוכן לשלב הבא?",
    continueLabel: "המשך לרגע הבא",
    skipLabel: "דלג לרגע הבא",
    choosePhotoLabel: "בחר תמונה",
    replacePhotoLabel: "בחר תמונה אחרת",
    submitMissionLabel: "שלח למשימה החיה",
    photoHint: "צלם רגע אמיתי מהאירוע והעלה אותו לקיר החי של הקהילה.",
    photoCaptionLabel: "כתוב מה רואים בתמונה",
    photoCaptionPlaceholder: "מה קורה ברגע הזה?",
    newPeopleMetLabel: "כמה אנשים חדשים הכרת במשימה הזו?",
    returnHomeLabel: "סיים וחזור לבית",
  },
  solo_female: {
    startLabel: "התחילי את הערב",
    startingLabel: "נכנסת לשידור החי...",
    readyLine: "מוכנה לשלב הבא?",
    continueLabel: "המשיכי לרגע הבא",
    skipLabel: "דלגי לרגע הבא",
    choosePhotoLabel: "בחרי תמונה",
    replacePhotoLabel: "בחרי תמונה אחרת",
    submitMissionLabel: "שלחי למשימה החיה",
    photoHint: "צלמי רגע אמיתי מהאירוע והעלי אותו לקיר החי של הקהילה.",
    photoCaptionLabel: "כתבי מה רואים בתמונה",
    photoCaptionPlaceholder: "מה קורה ברגע הזה?",
    newPeopleMetLabel: "כמה אנשים חדשים הכרת במשימה הזו?",
    returnHomeLabel: "סיימי וחזרי לבית",
  },
  family: {
    startLabel: "התחילו את הערב",
    startingLabel: "נכנסים לשידור החי...",
    readyLine: "מוכנים לשלב הבא?",
    continueLabel: "המשיכו לרגע הבא",
    skipLabel: "דלגו לרגע הבא",
    choosePhotoLabel: "בחרו תמונה",
    replacePhotoLabel: "בחרו תמונה אחרת",
    submitMissionLabel: "שלחו למשימה החיה",
    photoHint: "צלמו רגע אמיתי מהאירוע והעלו אותו לקיר החי של הקהילה.",
    photoCaptionLabel: "כתבו מה רואים בתמונה",
    photoCaptionPlaceholder: "מה קורה ברגע הזה?",
    newPeopleMetLabel: "כמה אנשים חדשים הכרתם במשימה הזו?",
    returnHomeLabel: "סיימו וחזרו לבית",
  },
};

export function normalizeParticipantType(value: unknown): ParticipantType {
  if (value === "solo_male" || value === "solo_female" || value === "family") {
    return value;
  }

  return "solo_male";
}

export function pickByParticipantType<T>(
  participantType: ParticipantType,
  options: ParticipantOptions<T>,
) {
  return options[normalizeParticipantType(participantType)];
}

export function getParticipantVoice(participantType: ParticipantType) {
  return participantVoices[normalizeParticipantType(participantType)];
}

export function getPlayerDisplayName(
  name: string,
  participantType: ParticipantType,
) {
  const trimmed = name.trim();
  if (normalizeParticipantType(participantType) !== "family") {
    return trimmed;
  }

  return trimmed.startsWith("משפחת ") ? trimmed : `משפחת ${trimmed}`;
}

export function getQuestionProgress(
  steps: RunStep[],
  currentStepIndex: number,
): StepProgress {
  const total = steps.filter((step) => step.kind === "question").length;
  const current = steps
    .slice(0, currentStepIndex + 1)
    .filter((step) => step.kind === "question").length;

  return { current, total };
}

export function getMissionProgress(
  steps: RunStep[],
  currentStepIndex: number,
): StepProgress {
  const total = steps.filter((step) => step.kind === "mission").length;
  const current = steps
    .slice(0, currentStepIndex + 1)
    .filter((step) => step.kind === "mission").length;

  return { current, total };
}

export function buildGalleryGroups(photos: GalleryEntry[]): GalleryGroup[] {
  const groups = new Map<string, GalleryGroup>();

  const sortedPhotos = [...photos].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  for (const photo of sortedPhotos) {
    const existing = groups.get(photo.playerId);

    if (existing) {
      existing.photos.push(photo);
      continue;
    }

    groups.set(photo.playerId, {
      playerId: photo.playerId,
      playerName: photo.playerName,
      cover: photo,
      photos: [photo],
      latestCreatedAt: photo.createdAt,
    });
  }

  return [...groups.values()].sort(
    (left, right) =>
      new Date(right.latestCreatedAt).getTime() -
      new Date(left.latestCreatedAt).getTime(),
  );
}
