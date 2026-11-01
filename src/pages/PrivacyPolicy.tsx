import { Link } from "react-router-dom";
import { LegalPage, SupportEmail } from "@/components/LegalPage";

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="1 November 2026"
      intro={
        <p>
          CUK Acadex is the academic management app for Central University of Kashmir. It is used by
          students, teachers, department administrators and the exams office. This page explains what
          personal data the app holds, why, who it is shared with, and the choices you have.
        </p>
      }
    >
      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong className="text-foreground">Account details:</strong> your name, email address, optional contact number, role (student, teacher or administrator), department and semester.</li>
          <li><strong className="text-foreground">Sign-in data:</strong> your password is handled by our authentication provider and stored only as a secure hash. We never see it.</li>
          <li><strong className="text-foreground">Academic records:</strong> course enrolments, exam schedules and seating, attendance, marks and end-semester results, assignments and submissions, leave requests and library records, as entered by you or by university staff.</li>
          <li><strong className="text-foreground">Activity records:</strong> changes made by administrators are logged (who changed what, and when) so they can be audited.</li>
          <li><strong className="text-foreground">Notifications and preferences:</strong> in-app notifications sent to you, and display choices such as your theme and dashboard background colour.</li>
          <li><strong className="text-foreground">Assistant questions:</strong> what you type into the AI assistant, as described below.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <p>
          Only to run the academic services the app provides: signing you in, showing you the records
          that belong to your role, scheduling exams and seating, sending notifications, and keeping the
          system secure. We do not sell personal data and do not use it for advertising.
        </p>
      </section>

      <section>
        <h2>Who can see your data</h2>
        <p>
          Access is limited by role and enforced in the database itself. Students see their own records.
          Teachers see what they need for the courses they teach. Department administrators see their
          department, and the exams office sees what it needs to run examinations.
        </p>
      </section>

      <section>
        <h2>Services we rely on</h2>
        <ul>
          <li><strong className="text-foreground">Supabase:</strong> stores the database and handles sign-in.</li>
          <li><strong className="text-foreground">Vercel:</strong> hosts the website.</li>
          <li>
            <strong className="text-foreground">AI assistant:</strong> your question and your last few messages
            are sent to our assistant server, which uses OpenRouter to generate an answer and may search
            the web (through Exa) for public university information. Don't put passwords or other
            sensitive personal details in the assistant. On the standalone assistant page, your last 50
            messages are kept in your browser so they survive a refresh; clearing the chat removes them.
          </li>
          <li>
            <strong className="text-foreground">Vercel Analytics:</strong> anonymous page-view and performance
            measurements. These run only if you choose “Accept all” on the cookie banner.
          </li>
        </ul>
      </section>

      <section>
        <h2>Cookies and browser storage</h2>
        <p>
          We use your browser's storage to keep you signed in, remember your theme, your cookie choice
          and your assistant conversation, and to cache the app so it works on a weak connection. These
          are needed for the app to work. Analytics are optional and stay off unless you accept them.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Account and academic records are kept while your account is active and for as long as the
          university needs them as academic records. You can delete your own notifications at any time.
        </p>
      </section>

      <section>
        <h2>Your choices and rights</h2>
        <p>
          You can view and update your profile in the app. To ask for a copy of your data, a correction,
          or deletion, or to raise any privacy concern, email <SupportEmail />. Some academic records may
          need to be kept by the university even after you leave. We handle requests in line with
          applicable law, including India's Digital Personal Data Protection Act, 2023.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this policy changes, we'll update the date at the top. See also the{" "}
          <Link to="/terms-and-conditions" className="text-foreground underline underline-offset-4">terms</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
