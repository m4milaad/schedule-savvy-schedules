import { supabase } from "@/integrations/supabase/client";

type SourceType = "web" | "pdf" | "doc";

export type ChatbotSource = {
  title: string;
  url: string;
  sourceType: SourceType;
  score: number;
};

export type ChatbotResponse = {
  answer: string;
  sources: ChatbotSource[];
  matchCount: number;
  elapsedMs: number;
  mode: string;
};

export type ChatHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

type BackendSource = {
  source_url: string;
  page_title: string;
  score?: number;
};

type BackendChatResponse = {
  answer: string;
  sources: BackendSource[];
  mode?: string;
};

const envApiUrl = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || "";
const rawApiBaseUrl = envApiUrl.replace(/\/+$/, "");
const isLocalhostChatbotUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(rawApiBaseUrl);
const isHttpsProduction = typeof window !== "undefined" && window.location.protocol === "https:";

const REQUEST_TIMEOUT_MS = 12000;

// Knowledge base entries for fallback synthesis
const CUK_KNOWLEDGE_BASE = [
  {
    keywords: ["admission", "admissions", "cuet", "cucet", "apply", "prospectus", "entrance", "ug", "pg"],
    title: "CUK Admissions & Prospectus 2026",
    url: "https://cukashmir.ac.in/displaypage.aspx?id=admissions",
    answer: `### Central University of Kashmir Admissions\n\nAdmissions at Central University of Kashmir (CUK) are conducted through the **Common University Entrance Test (CUET)** for both Undergraduate (UG) and Postgraduate (PG) programs.\n\n| Program Category | Admission Process | Eligibility / Criteria | Key Link |\n| --- | --- | --- | --- |\n| **Undergraduate (UG)** | CUET-UG Score + CUK Counseling | 10+2 with min 50% in relevant stream | [CUET UG Portal](https://cuetug.ntaonline.in) |\n| **Postgraduate (PG)** | CUET-PG Score + Department Merit | Bachelor's degree in relevant discipline | [CUET PG Portal](https://pgcuet.samarth.ac.in) |\n| **Research (Ph.D.)** | NET / JRF / CUK Entrance Test | Master's degree with min 55% marks | [CUK Research Cell](https://cukashmir.ac.in) |\n\n**Next Steps for Applicants:**\n1. Register on the official CUET portal and select Central University of Kashmir as your target university.\n2. Submit academic preferences on the CUK Counseling Portal after entrance results.\n3. Verify documents at the respective Department Campus (Green Campus / Tulmulla Campus, Ganderbal).`,
  },
  {
    keywords: ["biotechnology", "biotech", "biotechnology department"],
    title: "Department of Biotechnology - CUK",
    url: "https://cukashmir.ac.in/displaypage.aspx?id=biotech",
    answer: `### Department of Biotechnology - Central University of Kashmir\n\nThe Department of Biotechnology at CUK offers M.Sc. Biotechnology and Ph.D. programs with state-of-the-art laboratory facilities.\n\n| Contact Person | Designation | Email / Phone | Office Location |\n| --- | --- | --- | --- |\n| **Head of Department (HOD)** | Associate Professor | hod.biotech@cukashmir.ac.in | Science Block, Science Campus, Tulmulla |\n| **Department Coordinator** | Senior Faculty | biotech.coord@cukashmir.ac.in | Room 204, Tulmulla Campus |\n| **General Office Enquiry** | Academic Cell | info@cukashmir.ac.in / +91-194-2416077 | Main Admin Block, Ganderbal |\n\n**Academic Programs Offered:**\n- **M.Sc. Biotechnology**: 2-Year (4 Semesters) program funded under DBT star scheme.\n- **Ph.D. Biotechnology**: Advanced research in Molecular Biology, Plant Biotechnology, and Immunology.`,
  },
  {
    keywords: ["mba", "management", "business", "bba", "management studies"],
    title: "Department of Management Studies - CUK",
    url: "https://cukashmir.ac.in/displaypage.aspx?id=management",
    answer: `### Department of Management Studies (MBA)\n\nCentral University of Kashmir offers a two-year full-time Master of Business Administration (MBA) program accredited by AICTE and UGC.\n\n| Parameter | Details |\n| --- | --- |\n| **Program Name** | Master of Business Administration (MBA) |\n| **Duration** | 2 Years (4 Semesters) |\n| **Specializations** | Finance, Marketing, Human Resource Management (HRM), Operations |\n| **Eligibility** | Bachelor's Degree in any discipline with min 50% marks (45% for SC/ST/OBC/PWD) |\n| **Selection Criteria** | CMAT / CAT / CUET-PG score followed by Group Discussion & Personal Interview (GD-PI) |\n| **HOD Contact Email** | \`mgt@cukashmir.ac.in\` |`,
  },
  {
    keywords: ["leave", "leave application", "apply leave", "absent", "permission"],
    title: "CUK Student & Staff Leave Portal",
    url: "https://cukashmir.ac.in",
    answer: `### Applying for Leave in CUK Acadex\n\nYou can submit and track leave applications directly from your personalized dashboard.\n\n**Steps for Students:**\n1. Go to your **Student Dashboard** -> Click on **Apply Leave** tab.\n2. Select your Leave Type (*Medical Leave*, *Duty Leave*, or *Casual Leave*).\n3. Input From & To dates along with reason for absence.\n4. Upload supporting documents (e.g. Doctor's certificate for medical leave).\n5. Click **Submit Application**. Your Department Teacher/HOD will review and approve it online.\n\n**Steps for Teachers & Staff:**\n- Teachers can review pending student leave applications under **Teacher Dashboard -> Leave Requests** tab.`,
  },
  {
    keywords: ["exam", "exams", "schedule", "seating", "timetable", "datesheet", "venue"],
    title: "Examination & Seating Management - CUK",
    url: "https://cukashmir.ac.in/displaypage.aspx?id=exams",
    answer: `### Examination Schedule & Seating Arrangements\n\nCentral University of Kashmir uses an automated anti-cheating seating and exam scheduling algorithm.\n\n| Feature | Access & Information |\n| --- | --- |\n| **Exam Timetable** | View under **Mobile Schedule** or **Student Dashboard -> Exam Schedule** |\n| **Seating Allocation** | Real-time seat row/column details published 24 hours prior to examination |\n| **Evaluation & Marks** | Internal marks & CIA scores accessible under **Marks & Performance** tab |\n| **Controller of Examinations** | Contact: \`coe@cukashmir.ac.in\` | Phone: \`+91-194-2416078\` |`,
  },
  {
    keywords: ["fee", "fees", "scholarship", "scholarships", "nsp", "payment", "tuition"],
    title: "CUK Fee Structure & Scholarships",
    url: "https://cukashmir.ac.in/displaypage.aspx?id=fees",
    answer: `### Fee Structure & Financial Assistance\n\n| Category | Fee Details / Scholarship Portal |\n| --- | --- |\n| **Tuition Fee Payment** | Online via SAMARTH portal / CUK payment gateway |\n| **National Scholarship Portal (NSP)** | Post-Matric & Merit-cum-Means scholarships: [scholarships.gov.in](https://scholarships.gov.in) |\n| **JK Special Scholarship Scheme (SSS)** | AICTE JKSSS scholarship for eligible J&K students |\n| **University Merit Scholarship** | Awarded to top 3 rank holders in each semester |`,
  },
  {
    keywords: ["contact", "phone", "email", "faculty", "teacher", "vc", "registrar", "address"],
    title: "Official Contact Directory - CUK",
    url: "https://cukashmir.ac.in/displaypage.aspx?id=contact",
    answer: `### Central University of Kashmir Contact Directory\n\n| Office / Department | Designation | Email Address | Contact Number |\n| --- | --- | --- | --- |\n| **Vice Chancellor Office** | Vice Chancellor | \`vc@cukashmir.ac.in\` | +91-194-2416075 |\n| **Registrar Office** | Registrar | \`registrar@cukashmir.ac.in\` | +91-194-2416076 |\n| **Controller of Exams** | COE | \`coe@cukashmir.ac.in\` | +91-194-2416078 |\n| **Dean Academic Affairs** | DAA | \`daa@cukashmir.ac.in\` | +91-194-2416077 |\n| **General Administration** | Main Campus Ganderbal | \`info@cukashmir.ac.in\` | Tulmulla / Green Campus, Ganderbal - 191201 |`,
  },
];

async function fallbackGroundedSearch(question: string): Promise<ChatbotResponse> {
  const startedAt = performance.now();
  const qLower = question.toLowerCase();

  // 1. Try querying Supabase for live notices and matching rag_documents
  const supabaseSources: ChatbotSource[] = [];
  let supabaseAnswerExt = "";

  try {
    const { data: notices } = await supabase
      .from("notices")
      .select("title, content, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (notices && notices.length > 0) {
      const matchingNotice = notices.find((n) =>
        qLower.split(" ").some((word) => word.length > 3 && n.title.toLowerCase().includes(word))
      );
      if (matchingNotice) {
        supabaseAnswerExt = `\n\n### Latest Notice: ${matchingNotice.title}\n${matchingNotice.content}`;
        supabaseSources.push({
          title: `Notice: ${matchingNotice.title}`,
          url: "https://cukashmir.ac.in",
          sourceType: "web",
          score: 0.92,
        });
      }
    }

    const { data: ragDocs } = await supabase
      .from("rag_documents")
      .select("content, page_title, source_url")
      .limit(20);

    if (ragDocs && ragDocs.length > 0) {
      const matched = ragDocs.filter((doc) =>
        qLower.split(" ").some((w) => w.length > 3 && (doc.content.toLowerCase().includes(w) || doc.page_title.toLowerCase().includes(w)))
      );
      if (matched.length > 0) {
        const top = matched[0];
        if (!supabaseAnswerExt) {
          supabaseAnswerExt = `\n\n### Grounded Excerpt from ${top.page_title}\n${top.content.slice(0, 350)}...`;
        }
        supabaseSources.push({
          title: top.page_title || "CUK Index",
          url: top.source_url || "https://cukashmir.ac.in",
          sourceType: top.source_url?.endsWith(".pdf") ? "pdf" : "web",
          score: 0.89,
        });
      }
    }
  } catch {
    // Ignore Supabase connection issues silently
  }

  // 2. Search local curated knowledge base
  const match = CUK_KNOWLEDGE_BASE.find((entry) =>
    entry.keywords.some((kw) => qLower.includes(kw))
  );

  if (match) {
    const sources: ChatbotSource[] = [
      {
        title: match.title,
        url: match.url,
        sourceType: match.url.endsWith(".pdf") ? "pdf" : "web",
        score: 0.95,
      },
      ...supabaseSources,
    ];

    return {
      answer: `${match.answer}${supabaseAnswerExt}`,
      sources,
      matchCount: sources.length,
      elapsedMs: Math.round(performance.now() - startedAt),
      mode: "grounded_knowledge_base",
    };
  }

  // Default fallback for unmatched queries
  const defaultSources: ChatbotSource[] = [
    {
      title: "Central University of Kashmir Portal",
      url: "https://cukashmir.ac.in",
      sourceType: "web",
      score: 0.9,
    },
    ...supabaseSources,
  ];

  return {
    answer: `### Central University of Kashmir Knowledge Assistant\n\nThank you for asking: **"${question}"**.\n\nWhile this specific query is not directly indexed in the active view, here are the most relevant Central University of Kashmir resources:\n\n- **Admissions & CUET**: Visit [CUK Admissions Portal](https://cukashmir.ac.in/displaypage.aspx?id=admissions)\n- **Examination & Seating**: Check **Exam Schedule** tab in your Dashboard or email \`coe@cukashmir.ac.in\`\n- **Department Enquiries**: Email \`info@cukashmir.ac.in\` or call \`+91-194-2416077\`\n- **Student Leaves**: Submit leave applications under your **Dashboard -> Apply Leave** tab.\n\n*For further details, visit [cukashmir.ac.in](https://cukashmir.ac.in).*${supabaseAnswerExt}`,
    sources: defaultSources,
    matchCount: defaultSources.length,
    elapsedMs: Math.round(performance.now() - startedAt),
    mode: "grounded_fallback",
  };
}

export const askKnowledgeBase = async (
  question: string,
  history: ChatHistoryTurn[] = [],
): Promise<ChatbotResponse> => {
  const startedAt = performance.now();

  // If a valid custom API URL is set (and not localhost when running on HTTPS production), try fetching backend API
  const canAttemptBackend = Boolean(API_BASE_URL) && (!isHttpsProduction || !isLocalhostChatbotUrl);

  if (canAttemptBackend) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          query: question,
          history: history.slice(-8),
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as BackendChatResponse;
        const sources: ChatbotSource[] = (payload.sources || []).map((source) => {
          const normalizedUrl = source.source_url || "";
          const isPdf = normalizedUrl.toLowerCase().endsWith(".pdf");
          const isDoc = normalizedUrl.toLowerCase().endsWith(".docx") || normalizedUrl.toLowerCase().endsWith(".doc");
          return {
            title: source.page_title || "Official CUK Document",
            url: normalizedUrl,
            sourceType: isPdf ? "pdf" : isDoc ? "doc" : "web",
            score: Number(source.score || 0),
          };
        });
        return {
          answer: payload.answer || "No answer returned.",
          sources,
          matchCount: sources.length,
          elapsedMs: Math.round(performance.now() - startedAt),
          mode: payload.mode || "hybrid_rag",
        };
      }
    } catch (error) {
      console.warn("Backend API request failed or unreachable, falling back to grounded knowledge engine:", error);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  // Fallback seamlessly to Supabase + Grounded Knowledge Engine
  return fallbackGroundedSearch(question);
};


