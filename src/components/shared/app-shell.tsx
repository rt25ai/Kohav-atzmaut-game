"use client";

import { AmbientBackdrop } from "@/components/shared/ambient-backdrop";
import { BrandHeader } from "@/components/shared/brand-header";
import { SiteFooter } from "@/components/shared/site-footer";

export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen">
      <AmbientBackdrop />
      <BrandHeader />
      <main
        id="main-content"
        className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-6 lg:px-8"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
