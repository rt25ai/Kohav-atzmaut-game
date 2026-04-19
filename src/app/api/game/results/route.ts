import { NextResponse } from "next/server";

import { repository } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  try {
    const surveyRuntime = await repository.getSurveyRuntime();
    const surveyPhase = surveyRuntime.phase;
    const finalSurveySnapshot = surveyRuntime.finalResultsSnapshot;

    if (!playerId) {
      if (surveyPhase !== "finalized" || !finalSurveySnapshot) {
        return NextResponse.json(
          {
            error:
              "\u05D7\u05E1\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05E9\u05D7\u05E7\u05DF",
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        results: null,
        surveyPhase,
        finalSurveySnapshot,
      });
    }

    const results = await repository.getSurveyResults(playerId);

    if (!results.completed && surveyPhase === "live") {
      return NextResponse.json(
        {
          error:
            "\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05D4\u05E1\u05E7\u05E8 \u05E0\u05E4\u05EA\u05D7\u05D5\u05EA \u05E8\u05E7 \u05D0\u05D7\u05E8\u05D9 \u05E9\u05DE\u05E1\u05D9\u05D9\u05DE\u05D9\u05DD",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      results,
      surveyPhase,
      finalSurveySnapshot,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "\u05D4\u05E9\u05D7\u05E7\u05DF \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0",
      },
      { status: 404 },
    );
  }
}
