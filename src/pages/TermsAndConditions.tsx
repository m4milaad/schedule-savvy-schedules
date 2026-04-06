import { Link } from "react-router-dom";

const supportEmail = "mb4milad.bhattt@cukashmir.edu.in";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="glass-card rounded-2xl border border-border/60 p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Terms and Conditions</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: April 6, 2026</p>

          <section className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              By using this platform, you agree to use it for legitimate academic and
              administrative purposes only. Unauthorized access, abuse, or disruption of services
              is prohibited.
            </p>
            <p>
              Features, availability, and policies may be updated over time. Continued use after
              updates indicates acceptance of the revised terms.
            </p>
            <p>
              You are responsible for keeping your account credentials secure and for reporting any
              suspicious activity immediately.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Contact and Support</h2>
            <p className="text-sm text-muted-foreground mt-2">
              General support:{" "}
              <a
                className="text-primary underline underline-offset-4"
                href={`mailto:${supportEmail}`}
              >
                {supportEmail}
              </a>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Report a bug:{" "}
              <a
                className="text-primary underline underline-offset-4"
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                  "Bug Report - CUK Acadex"
                )}&body=${encodeURIComponent(
                  "Please describe the issue, expected behavior, and steps to reproduce."
                )}`}
              >
                Open bug report email
              </a>
            </p>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/privacy-policy" className="text-sm text-primary underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link to="/" className="text-sm text-primary underline underline-offset-4">
              Back to app
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
