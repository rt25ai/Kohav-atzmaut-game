"use client";

import Image from "next/image";
import Link from "next/link";
import { Globe, Sparkles } from "lucide-react";

const websiteUrl = "https://www.rt-ai.co.il";
const instagramUrl = "https://www.instagram.com/roital_ai";
const footerLogoSrc = "/branding/rt-ai-logo.png";

function InstagramGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 px-4 pb-6 pt-2 sm:px-6 lg:px-8">
      <div className="stage-panel-soft mx-auto flex max-w-[92rem] flex-col gap-4 rounded-[28px] px-5 py-4 text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
            <Image
              src={footerLogoSrc}
              alt="לוגו רועי טל AI"
              fill
              className="object-contain drop-shadow-[0_12px_24px_rgba(74,176,255,0.26)]"
              sizes="56px"
            />
          </div>
          <div>
            <p className="font-display text-lg text-white">רועי טל</p>
            <p className="text-sm text-[var(--text-dim)]">
              חוויות דיגיטליות חכמות, מהוקצעות ומלאות אופי
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="broadcast-chip">
            <Sparkles size={14} />
            <span>אירוע קהילתי חי בעיצוב חגיגי</span>
          </div>
          <Link
            href={websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="hero-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-[var(--text-main)]"
          >
            <Globe size={16} />
            www.rt-ai.co.il
          </Link>
          <Link
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="hero-button-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-[var(--text-main)]"
          >
            <InstagramGlyph />
            @roital_ai
          </Link>
        </div>
      </div>
    </footer>
  );
}
