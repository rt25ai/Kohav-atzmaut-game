"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SummaryResultsCard } from "@/components/summary/summary-results-card";
import type { SurveyQuestionResult } from "@/lib/types";

type SummaryResultsSheetProps = {
  open: boolean;
  onClose: () => void;
  questionResults: SurveyQuestionResult[];
};

const SWIPE_THRESHOLD = 48;

export function SummaryResultsSheet({
  open,
  onClose,
  questionResults,
}: SummaryResultsSheetProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const total = questionResults.length;

  useEffect(() => {
    if (!open) {
      setActiveIndex(0);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < total - 1;
  const activeQuestion = questionResults[activeIndex] ?? null;

  if (!open || !activeQuestion || total === 0) {
    return null;
  }

  const goPrev = () => {
    setActiveIndex((current) => (current > 0 ? current - 1 : current));
  };

  const goNext = () => {
    setActiveIndex((current) =>
      current < total - 1 ? current + 1 : current,
    );
  };

  const handleTouchEnd = (clientX: number) => {
    const touchStartX = touchStartXRef.current;
    touchStartXRef.current = null;

    if (touchStartX === null) {
      return;
    }

    const deltaX = clientX - touchStartX;
    if (deltaX <= -SWIPE_THRESHOLD) {
      goNext();
      return;
    }

    if (deltaX >= SWIPE_THRESHOLD) {
      goPrev();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#031122d9] backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.section
          data-summary-results-sheet
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          onClick={(event) => event.stopPropagation()}
          className="glass-panel absolute inset-x-0 bottom-0 mx-auto flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[32px] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] [overscroll-behavior:contain] sm:bottom-4 sm:rounded-[32px] sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <button
              data-summary-results-close
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-white"
              aria-label="סגירת התוצאות"
            >
              <X size={20} />
            </button>

            <div className="text-right">
              <p className="text-sm text-[var(--text-dim)]">תוצאות הסקר שלך</p>
              <p className="mt-2 font-display text-2xl text-white sm:text-3xl">
                {activeIndex + 1} / {total}
              </p>
            </div>
          </div>

          <div
            className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [touch-action:pan-y]"
            onTouchStart={(event) => {
              touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              handleTouchEnd(event.changedTouches[0]?.clientX ?? 0);
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeQuestion.questionId}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <SummaryResultsCard
                  result={activeQuestion}
                  index={activeIndex}
                  total={total}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 flex shrink-0 items-center justify-between gap-3">
            <button
              data-summary-results-next
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="hero-button-primary inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={18} />
              לשאלה הבאה
            </button>
            <button
              data-summary-results-prev
              type="button"
              onClick={goPrev}
              disabled={!canGoPrev}
              className="hero-button-secondary inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRight size={18} />
              לשאלה הקודמת
            </button>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
