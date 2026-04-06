import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type ConsentChoice = "accepted" | "declined";

const CONSENT_STORAGE_KEY = "cuk-cookie-consent-v1";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const supportEmail = "mb4milad.bhattt@cukashmir.edu.in";

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_STORAGE_KEY);
    setVisible(saved !== "accepted" && saved !== "declined");
  }, []);

  const message = useMemo(
    () =>
      "We use essential cookies for login, security, and offline reliability. Optional analytics cookies help us improve your experience.",
    []
  );

  const setConsent = (choice: ConsentChoice) => {
    setLeaving(true);
    setTimeout(() => {
      localStorage.setItem(CONSENT_STORAGE_KEY, choice);
      setVisible(false);
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-x-4 bottom-4 z-[70] md:inset-x-auto md:bottom-6 md:left-6 md:right-auto md:max-w-[480px] transition-all duration-300 ${
        leaving ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
      }`}
    >
      {/* Geometric accent line */}
      <div className="absolute -top-px left-8 right-8 h-px bg-border/70" />

      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl">
        {/* Subtle corner accent */}
        <div className="absolute right-0 top-0 h-24 w-24 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-primary/15" />
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full border border-primary/10" />
        </div>

        <div className="p-5 md:p-6">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-4">
            {/* Icon */}
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent border border-border/70">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  Privacy & Cookies
                </p>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="mb-4 h-px bg-border/40" />

          {/* Links */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {[
              { type: "link", to: "/privacy-policy", label: "Privacy Policy" },
              { type: "link", to: "/terms-and-conditions", label: "Terms" },
              {
                type: "mail",
                href: `mailto:${supportEmail}?subject=${encodeURIComponent("Support Request - CUK Acadex")}`,
                label: "Support",
              },
              {
                type: "mail",
                href: `mailto:${supportEmail}?subject=${encodeURIComponent("Bug Report - CUK Acadex")}&body=${encodeURIComponent("Please describe the bug, steps to reproduce, and your device/browser.")}`,
                label: "Bug Report",
              },
            ].map((item) =>
              item.type === "link" ? (
                <Link
                  key={item.label}
                  to={item.to!}
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground hover:bg-accent"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground hover:bg-accent"
                >
                  {item.label}
                </a>
              )
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 rounded-lg border-border/70 bg-background text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border"
              onClick={() => setConsent("declined")}
            >
              Essential only
            </Button>
            <Button
              size="sm"
              className="h-8 flex-1 rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              onClick={() => setConsent("accepted")}
            >
              Accept all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}