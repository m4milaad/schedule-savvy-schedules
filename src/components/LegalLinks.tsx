import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/** "Privacy · Terms" — used in every page footer and at the bottom of each dashboard sidebar. */
export const LegalLinks = ({ className }: { className?: string }) => (
  <nav aria-label="Legal" className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
    <Link to="/privacy-policy" className="hover:text-foreground hover:underline underline-offset-4">
      Privacy policy
    </Link>
    <span aria-hidden="true">·</span>
    <Link to="/terms-and-conditions" className="hover:text-foreground hover:underline underline-offset-4">
      Terms
    </Link>
  </nav>
);

// These screens put the links in their sidebar (or their own footer) instead.
const OWN_LEGAL_LINKS = ["/admin-dashboard", "/student-dashboard", "/teacher-dashboard", "/admin-logs"];

/** Site-wide footer line, rendered once in App after the routes. */
export const LegalFooter = () => {
  const { pathname } = useLocation();
  // "/" is the login page, which shows the links under its card.
  if (pathname === "/" || OWN_LEGAL_LINKS.some((p) => pathname.startsWith(p))) return null;
  return (
    <footer className="relative z-10 flex justify-center px-4 py-4">
      <LegalLinks />
    </footer>
  );
};
