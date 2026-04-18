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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#02142ccc] p-4 backdrop-blur-md [overscroll-behavior:contain]"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 rounded-full bg-white/16 p-2 text-white"
            aria-label="סגירה"
          >
            <X size={22} />
          </button>

          {hasMultipleItems ? (
            <button
              type="button"
              onClick={() =>
                setActiveIndex((index) =>
                  index === 0 ? items.length - 1 : index - 1,
                )
              }
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/16 p-3 text-white"
              aria-label="התמונה הקודמת"
            >
              <ArrowRight size={22} />
            </button>
          ) : null}

          {hasMultipleItems ? (
            <button
              type="button"
              onClick={() =>
                setActiveIndex((index) =>
                  index === items.length - 1 ? 0 : index + 1,
                )
              }
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/16 p-3 text-white"
              aria-label="התמונה הבאה"
            >
              <ArrowLeft size={22} />
            </button>
          ) : null}

          <motion.div
            initial={{ scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="glass-panel relative w-full max-w-4xl overflow-hidden rounded-[28px] p-3"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[22px] bg-[#e9f5ff] sm:aspect-[16/10]">
              <Image
                src={current.src}
                alt={current.alt}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
            <div className="px-3 pb-2 pt-4 text-right">
              {current.title ? (
                <p className="font-display text-lg text-[#0c2f61]">{current.title}</p>
              ) : null}
              {current.caption ? (
                <p className="mt-1 text-sm text-[#44658f]">{current.caption}</p>
              ) : null}
              {hasMultipleItems ? (
                <p className="mt-3 text-xs text-[#5c7ca2]">
                  תמונה {activeIndex + 1} מתוך {items.length}
                </p>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
