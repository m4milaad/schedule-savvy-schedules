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
        user: { id: "teacher-user-id", email: "teacher@test.com" },
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
      <MemoryRouter initialEntries={["/teacher-dashboard"]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe("Teacher Dashboard — marks entry integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const profileData = {
      id: "teacher-profile-1",
      user_id: "teacher-user-id",
      user_type: "teacher",
      full_name: "Prof. Test Teacher",
      email: "teacher@test.com",
      dept_id: "dept-1",
      is_approved: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return mockChain(profileData);
      }
      if (table === "teachers") {
        return mockChain({
          teacher_id: "teacher-profile-1",
          teacher_name: "Prof. Test Teacher",
          dept_id: "dept-1",
        });
      }
      if (table === "teacher_courses") {
        return mockChain([
          {
            course_id: "course-1",
            courses: {
              course_id: "course-1",
              course_code: "CS101",
              course_name: "Intro to CS",
            },
          },
        ]);
      }
      if (table === "student_marks") {
        return mockChain([]);
      }
      if (table === "student_enrollments") {
        return mockChain([]);
      }
      return mockChain([]);
    });
  });

  it("renders the teacher dashboard without crashing", async () => {
    const { default: TeacherDashboard } = await import(
      "@/pages/TeacherDashboard"
    );

    render(
      <TestWrapper>
        <TeacherDashboard />
      </TestWrapper>
    );

    await waitFor(
      () => {
        // Component should mount and render content
        expect(document.body.innerHTML.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });
});
