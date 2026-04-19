"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useEffect, useState } from "react";

export type LightboxItem = {
  src: string;
  alt: string;
  caption?: string | null;
  title?: string;
};

type LightboxProps = {
  open: boolean;
  onClose: () => void;
  items: LightboxItem[];
  initialIndex?: number;
};

export function Lightbox({
  open,
  onClose,
  items,
  initialIndex = 0,
}: LightboxProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setActiveIndex(initialIndex);
    }
  }, [initialIndex, open]);

  const current = items[activeIndex];
  const hasMultipleItems = items.length > 1;

  if (!current) {
    return null;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#02142ce6] p-3 backdrop-blur-md [overscroll-behavior:contain] sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0.6, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 8 }}
            onClick={(event) => event.stopPropagation()}
            className="glass-panel relative w-full max-w-4xl overflow-hidden rounded-[28px] p-3 sm:p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 text-right">
                {current.title ? (
                  <p className="font-display text-lg text-white sm:text-xl">
                    {current.title}
                  </p>
                ) : null}
                {current.caption ? (
                  <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                    {current.caption}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 text-white"
                aria-label="סגירה"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative overflow-hidden rounded-[22px] bg-[#071427]">
              <div className="relative aspect-[4/5] w-full sm:aspect-[16/10]">
                <Image
                  src={current.src}
                  alt={current.alt}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>

              {hasMultipleItems ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((index) =>
                        index === 0 ? items.length - 1 : index - 1,
                      )
                    }
                    className="absolute right-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#071427c9] text-white sm:right-4"
                    aria-label="התמונה הקודמת"
                  >
                    <ArrowRight size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((index) =>
                        index === items.length - 1 ? 0 : index + 1,
                      )
                    }
                    className="absolute left-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#071427c9] text-white sm:left-4"
                    aria-label="התמונה הבאה"
                  >
                    <ArrowLeft size={20} />
                  </button>
                </>
              ) : null}
            </div>

            {hasMultipleItems ? (
              <p className="pt-3 text-center text-xs text-[var(--text-dim)]">
                תמונה {activeIndex + 1} מתוך {items.length}
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
