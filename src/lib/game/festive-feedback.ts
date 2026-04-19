export type FestiveEventName =
  | "answer-saved"
  | "step-transition"
  | "photo-chosen"
  | "mission-uploaded"
  | "summary-uploaded"
  | "summary-finished";

export type FestiveCue = {
  copy: string;
  emojis: string[];
  showConfetti: boolean;
};

const cueMap: Record<FestiveEventName, Array<Omit<FestiveCue, "showConfetti">>> = {
  "answer-saved": [
    { copy: "נשמר, איזה כיף", emojis: ["✨", "🎉", "💙"] },
    { copy: "בחירה יפה", emojis: ["🇮🇱", "✨"] },
    { copy: "ממשיכים יחד", emojis: ["🎉", "💙"] },
  ],
  "step-transition": [
    { copy: "ממשיכים לרגע הבא", emojis: ["✨", "🇮🇱"] },
    { copy: "יש עוד רגעים יפים", emojis: ["💙", "✨"] },
  ],
  "photo-chosen": [
    { copy: "עוד רגע יפה מהאירוע", emojis: ["📸", "✨"] },
    { copy: "בחרת רגע ששווה לזכור", emojis: ["📸", "💙"] },
  ],
  "mission-uploaded": [
    { copy: "התמונה עלתה לגלריה", emojis: ["📸", "🎉", "🇮🇱"] },
    { copy: "הרגע הזה כבר איתנו", emojis: ["📸", "✨", "💙"] },
  ],
  "summary-uploaded": [
    { copy: "עוד תמונה הצטרפה לחגיגה", emojis: ["📸", "🎉", "🇮🇱"] },
    { copy: "ממשיכים לשתף רגעים", emojis: ["✨", "💙"] },
  ],
  "summary-finished": [
    { copy: "איזה סיום חגיגי", emojis: ["🇮🇱", "🎉", "🥳"] },
  ],
};

export function getFestiveCue(
  eventName: FestiveEventName,
  iteration: number,
): FestiveCue {
  const variants = cueMap[eventName];
  const variant = variants[Math.abs(iteration) % variants.length];

  const showConfetti =
    eventName === "summary-finished" ||
    ((eventName === "answer-saved" ||
      eventName === "mission-uploaded" ||
      eventName === "summary-uploaded") &&
      (iteration + 1) % 3 === 0);

  return {
    ...variant,
    showConfetti,
  };
}
