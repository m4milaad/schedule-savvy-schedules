import { Link } from "react-router-dom";

const supportEmail = "mb4milad.bhattt@cukashmir.edu.in";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="glass-card rounded-2xl border border-border/60 p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: April 6, 2026</p>

          <section className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              This app uses required storage and technical data to provide authentication, core
              functionality, and offline reliability. We process only the data needed to run the
              academic management experience.
            </p>
            <p>
              Optional analytics may be used to improve quality and performance. You can manage
              cookie/storage preference from the consent banner when prompted.
            </p>
            <p>
              We do not sell personal data. Access is role-based and governed by backend security
              controls, including authentication and row-level permissions.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Contact and Support</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Privacy requests and support:{" "}
              <a
                className="text-primary underline underline-offset-4"
                href={`mailto:${supportEmail}`}
              >
                {supportEmail}
              </a>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Bug report:{" "}
              <a
                className="text-primary underline underline-offset-4"
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                  "Bug Report - CUK Acadex"
                )}&body=${encodeURIComponent(
                  "Please describe the issue, expected behavior, and device/browser details."
                )}`}
              >
                Send bug report
              </a>
            </p>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/terms-and-conditions"
              className="text-sm text-primary underline underline-offset-4"
            >
              Terms and Conditions
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
