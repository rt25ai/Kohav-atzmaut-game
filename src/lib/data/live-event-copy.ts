import type { ParticipantType, PlayerAnswerRecord } from "@/lib/types";
import { pickByParticipantType } from "@/lib/game/player-experience";

export function formatSurveyAnswerEventMessage(
  displayName: string,
  participantType: ParticipantType,
  status: PlayerAnswerRecord["status"],
) {
  if (status === "skipped") {
    return `${displayName} ${pickByParticipantType(participantType, {
      solo_male: "דילג והמשיך הלאה",
      solo_female: "דילגה והמשיכה הלאה",
      family: "דילגו והמשיכו הלאה",
    })}`;
  }

  return `${displayName} ${pickByParticipantType(participantType, {
    solo_male: "בחר תשובה והוסיף קול חדש לסקר",
    solo_female: "בחרה תשובה והוסיפה קול חדש לסקר",
    family: "בחרו תשובה והוסיפו קול חדש לסקר",
  })}`;
}

export function formatSurveyMomentumEventMessage(
  displayName: string,
  participantType: ParticipantType,
) {
  return `${displayName} ${pickByParticipantType(participantType, {
    solo_male: "בלט בגל התשובות האחרון",
    solo_female: "בלטה בגל התשובות האחרון",
    family: "בלטו בגל התשובות האחרון",
  })}`;
}

export function formatAdminActivityUpdateMessage(displayName: string) {
  return `הפעילות של ${displayName} עודכנה ידנית`;
}
