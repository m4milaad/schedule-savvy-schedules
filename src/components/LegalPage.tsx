import React from "react";
import { Link } from "react-router-dom";

export const SUPPORT_EMAIL = "mb4milad.bhattt@cukashmir.edu.in";

/** Shared frame for the privacy policy and terms: title, date, readable sections. */
export const LegalPage = ({ title, updated, intro, children }: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="min-h-screen bg-background text-foreground">
    <main className="mx-auto max-w-3xl px-4 py-10 md:py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← CUK Acadex</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="mt-6 text-base leading-relaxed text-muted-foreground">{intro}</div>
      <div className="mt-10 flex flex-col gap-10 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:mt-1.5 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </main>
  </div>
);

export const SupportEmail = () => (
  <a className="text-foreground underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
    {SUPPORT_EMAIL}
  </a>
);
