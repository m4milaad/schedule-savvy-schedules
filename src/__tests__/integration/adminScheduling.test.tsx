import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSupabaseFrom = vi.fn();
const mockSupabaseAuth = {
  getSession: vi.fn().mockResolvedValue({
    data: {
      session: {
        user: { id: "admin-user-id", email: "admin@test.com" },
        access_token: "tok",
        refresh_token: "ref",
      },
    },
  }),
  onAuthStateChange: vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  }),
  signOut: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]): unknown => mockSupabaseFrom(...args),
    auth: mockSupabaseAuth,
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

vi.mock("@/lib/logger", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/offlineCache", () => ({
  getCachedData: vi.fn().mockResolvedValue(null),
  setCachedData: vi.fn().mockResolvedValue(undefined),
  isOnline: vi.fn().mockResolvedValue(true),
  persistAuthSession: vi.fn().mockResolvedValue(undefined),
  clearPersistedAuthSession: vi.fn().mockResolvedValue(undefined),
  DEFAULT_TTL: { SCHEDULE: 300000, ADMIN_TABLES: 600000 },
}));

function mockChain(resolvedData: unknown = [], error: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: resolvedData, error });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolvedData, error });
  chain.range = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: resolvedData, error }).then(resolve);
  return chain;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin-dashboard"]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Dashboard — scheduling integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const profileData = {
      id: "admin-profile-1",
      user_id: "admin-user-id",
      user_type: "admin",
      full_name: "Admin User",
      email: "admin@test.com",
      dept_id: null,
      is_approved: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return mockChain(profileData);
      }
      if (table === "courses") {
        return mockChain([
          {
            course_id: "c1",
            course_code: "CS101",
            course_name: "Intro CS",
            semester: 1,
            program_type: "B.Tech",
            gap_days: 2,
            departments: { dept_name: "CS" },
          },
          {
            course_id: "c2",
            course_code: "CS201",
            course_name: "Data Structures",
            semester: 2,
            program_type: "B.Tech",
            gap_days: 2,
            departments: { dept_name: "CS" },
          },
        ]);
      }
      if (table === "holidays") {
        return mockChain([]);
      }
      if (table === "sessions") {
        return mockChain([]);
      }
      if (table === "datesheets") {
        return mockChain([]);
      }
      return mockChain([]);
    });
  });

  it("renders the admin dashboard without crashing", async () => {
    const { default: AdminDashboard } = await import(
      "@/pages/AdminDashboard"
    );

    render(
      <TestWrapper>
        <AdminDashboard />
      </TestWrapper>
    );

    await waitFor(
      () => {
        expect(document.body.innerHTML.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it("the schedule algorithm can process the mocked course data", async () => {
    const { generateEnhancedSchedule } = await import(
      "@/utils/scheduleAlgorithm"
    );

    const courses = [
      {
        id: "c1",
        course_code: "CS101",
        course_name: "Intro CS",
        teacher_name: null,
        dept_name: "CS",
        semester: 1,
        program_type: "B.Tech",
        gap_days: 2,
        course_id: "c1",
        teacher_id: "",
      },
      {
        id: "c2",
        course_code: "CS201",
        course_name: "Data Structures",
        teacher_name: null,
        dept_name: "CS",
        semester: 2,
        program_type: "B.Tech",
        gap_days: 2,
        course_id: "c2",
        teacher_id: "",
      },
    ];

    const start = new Date("2026-06-01");
    const end = new Date("2026-06-30");

    const schedule = generateEnhancedSchedule(courses, start, end, [], {});

    expect(schedule).toHaveLength(2);
    expect(schedule.every((item) => item.exam_date)).toBe(true);
    expect(schedule.every((item) => item.course_code)).toBe(true);
  });
});
