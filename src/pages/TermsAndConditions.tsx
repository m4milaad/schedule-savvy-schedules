import { Link } from "react-router-dom";
import { LegalPage, SupportEmail } from "@/components/LegalPage";

export default function TermsAndConditions() {
  return (
    <LegalPage
      title="Terms of use"
      updated="1 November 2026"
      intro={
        <p>
          These terms apply to everyone who uses CUK Acadex, the academic management app for Central
          University of Kashmir. By creating an account or signing in, you agree to them.
        </p>
      }
    >
      <section>
        <h2>Who can use it</h2>
        <p>
          The app is for students, teachers and staff of Central University of Kashmir. Some accounts,
          such as department administrators and teachers, must be approved by a super administrator
          before they can be used.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>Give accurate details and keep them up to date.</li>
          <li>Keep your password private and don't share your account.</li>
          <li>Tell us straight away at <SupportEmail /> if you think someone else has used it.</li>
        </ul>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>Use the app only for genuine academic and administrative work. Don't:</p>
        <ul>
          <li>try to access records, accounts or features your role doesn't allow;</li>
          <li>enter false marks, attendance, results or other records;</li>
          <li>upload harmful files, or try to disrupt, overload or probe the service;</li>
          <li>copy or publish other people's personal data from the app.</li>
        </ul>
        <p>
          Misuse may lead to your account being suspended and may be reported under university
          regulations.
        </p>
      </section>

      <section>
        <h2>Academic records</h2>
        <p>
          The app shows records entered by university staff. If something looks wrong, contact your
          department or the exams office. Where the app and the university's official records disagree,
          the official records apply.
        </p>
      </section>

      <section>
        <h2>The AI assistant</h2>
        <p>
          The assistant answers from university documents and public sources, but it can be wrong or
          out of date. Check anything important, such as dates, eligibility or fees, against official
          university notices before relying on it.
        </p>
      </section>

      <section>
        <h2>Availability and changes</h2>
        <p>
          We work to keep the app available but can't promise it will always be free of interruptions
          or errors. Features and these terms may change; we'll update the date at the top when they do,
          and continuing to use the app means you accept the updated terms.
        </p>
      </section>

      <section>
        <h2>Privacy</h2>
        <p>
          How we handle personal data is explained in the{" "}
          <Link to="/privacy-policy" className="text-foreground underline underline-offset-4">privacy policy</Link>.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>Questions about these terms, or to report a problem: <SupportEmail />.</p>
      </section>
    </LegalPage>
  );
}
