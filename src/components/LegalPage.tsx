import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminTheme } from "@/components/admin/AdminPanel";

export const SUPPORT_EMAIL = "mb4milad.bhattt@cukashmir.edu.in";

/**
 * Shared frame for the privacy policy and terms, in the dashboard's look:
 * a header bar, a title row, and one card of two-column sections (heading left, text right).
 */
export const LegalPage = ({ title, updated, intro, children }: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) => {
  useAdminTheme();
  const navigate = useNavigate();
  const location = useLocation();
  // Back returns to wherever the reader came from (e.g. the dashboard tab); a direct visit goes home.
  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate("/"));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-sidebar">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2.5 px-4 md:px-8">
          <img src="./CUKLogo.ico" alt="" className="h-7 w-7 object-contain" />
          <span className="text-sm font-semibold">CUK Acadex</span>
          <Button variant="ghost" size="sm" className="ml-auto gap-2 text-muted-foreground" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-8 pt-8 md:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">{intro}</div>

        <div
          className={[
            "mt-6 divide-y rounded-lg border bg-card text-sm leading-relaxed text-muted-foreground",
            "[&>section]:grid [&>section]:gap-x-10 [&>section]:gap-y-3 [&>section]:px-5 [&>section]:py-6",
            "md:[&>section]:grid-cols-[220px_minmax(0,1fr)] md:[&>section>*:not(h2)]:col-start-2",
            "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground",
            "[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5",
          ].join(" ")}
        >
          {children}
        </div>
      </main>
    </div>
  );
};

export const SupportEmail = () => (
  <a className="text-foreground underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
    {SUPPORT_EMAIL}
  </a>
);
