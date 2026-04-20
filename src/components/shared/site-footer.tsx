"use client";

import Image from "next/image";
import Link from "next/link";
import { Globe } from "lucide-react";

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
    <footer className="relative z-10 px-4 pb-8 pt-2 sm:px-6 lg:px-8">
      <div className="footer-credit-panel mx-auto max-w-lg rounded-[32px] px-6 py-8 sm:px-10">
        <div className="flex flex-col items-center gap-5 text-center">

          <div className="footer-logo-ring">
            <Image
              src={footerLogoSrc}
              alt="לוגו רועי טל AI"
              fill
              className="object-contain"
              sizes="72px"
            />
          </div>

          <div>
            <p className="footer-brand-name">רועי טל</p>
            <p className="footer-brand-sub">AI פשוט בעולם חכם</p>
          </div>

          <div className="footer-divider" aria-hidden="true" />

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="footer-social-pill footer-social-pill--web"
            >
              <Globe size={15} />
              www.rt-ai.co.il
            </Link>
            <Link
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="footer-social-pill footer-social-pill--insta"
            >
              <InstagramGlyph />
              @roital_ai
            </Link>
          </div>

          <p className="footer-follow-cta">
            מוזמנים לפרגן ב‑Follow אם נהנתם 😃
          </p>

        </div>
      </div>
    </footer>
  );
}
