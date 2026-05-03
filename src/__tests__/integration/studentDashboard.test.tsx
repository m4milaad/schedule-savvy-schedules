import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the component
// ---------------------------------------------------------------------------

// Mock Supabase client
const mockSupabaseFrom = vi.fn();
const mockSupabaseAuth = {
  getSession: vi.fn().mockResolvedValue({
    data: {
      session: {
        user: { id: "test-user-id", email: "student@test.com" },
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

// Build a chainable mock that returns data
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

  // When the chain is awaited directly (e.g. const { data } = await supabase.from(...).select())
  chain.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: resolvedData, error }).then(resolve);

  return chain;
}

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

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
      <MemoryRouter initialEntries={["/student-dashboard"]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe("Student Dashboard — integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Profile query returns a student
    const profileData = {
      id: "profile-1",
      user_id: "test-user-id",
      user_type: "student",
      full_name: "Test Student",
      email: "student@test.com",
      dept_id: "dept-1",
      semester: 3,
      is_approved: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return mockChain(profileData);
      }
      if (table === "students") {
        return mockChain({
          student_id: "profile-1",
          student_name: "Test Student",
          student_enrollment_no: "ENR-001",
          semester: 3,
          dept_id: "dept-1",
        });
      }
      if (table === "student_enrollments") {
        return mockChain([]);
      }
      // Default
      return mockChain([]);
    });
  });

  it("renders the student dashboard without crashing", async () => {
    // We import lazily because the module requires mocks to be set up first
    const { default: StudentDashboard } = await import(
      "@/pages/StudentDashboard"
    );

    render(
      <TestWrapper>
        <StudentDashboard />
      </TestWrapper>
    );

    // The dashboard should eventually render some content
    await waitFor(
      () => {
        // At minimum the component should mount without throwing
        expect(document.body.innerHTML.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });
});
