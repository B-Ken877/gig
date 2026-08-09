import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PageType, User, Agent, JobPost, JobApplication, Placement,
  Notification, AuditLog, ToastMessage, UserRole, Provider, SalaryDate,
} from '@/lib/types';

export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const state = useAppStore.getState();
  const user = state.currentUser;
  const headers = new Headers(init?.headers);
  if (user) {
    headers.set('X-User-Id', user.id);
    headers.set('X-User-Role', user.role);
  }
  return fetch(input, { ...init, headers });
}

const PUBLIC_PAGES: ReadonlySet<PageType> = new Set<PageType>([
  'home', 'services', 'careers', 'about', 'contact', 'academy',
  'login', 'register-agent', 'pending-payment',
]);

const VALID_PAGES: ReadonlySet<PageType> = new Set<PageType>([
  'home', 'services', 'careers', 'about', 'contact', 'academy',
  'login', 'register-agent', 'pending-payment',
  'agent-dashboard', 'agent-profile', 'agent-documents', 'agent-availability', 'agent-applications', 'agent-my-work', 'agent-verify-id',
  'admin-dashboard', 'admin-users', 'admin-job-posts', 'admin-providers',
  'admin-placements', 'admin-salary-dates',
  'messages', 'support', 'tickets',
]);

function effectiveRole(role: string | undefined): UserRole {
  if (!role) return 'visitor';
  if (role === 'payment_taker' || role === 'client') return 'admin';
  return role as UserRole;
}

const ROLE_PAGE_MAP: Partial<Record<UserRole, ReadonlySet<PageType>>> = {
  agent: new Set([
    'agent-dashboard', 'agent-profile', 'agent-documents', 'agent-availability',
    'agent-applications', 'agent-my-work', 'agent-verify-id', 'academy', 'messages', 'support',
    'pending-payment',
  ]),
  admin: new Set([
    'admin-dashboard', 'admin-users', 'admin-job-posts', 'admin-providers',
    'admin-placements', 'admin-salary-dates',
    'academy', 'messages', 'tickets', 'support',
  ]),
};

interface AuthSlice {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string; email: string; password: string;
    role: UserRole; phone?: string;
    agentProfile?: Record<string, unknown>;
  }) => Promise<{ message?: string; requiresApproval?: boolean; userId?: string }>;
  logout: () => void;
  updateCurrentUser: (patch: Partial<User>) => void;
}

const createAuthSlice = (
  set: (fn: (state: AppStore) => Partial<AppStore>) => void,
): AuthSlice => ({
  currentUser: null, isAuthenticated: false, isLoading: false,
  login: async (email: string, password: string) => {
    set(() => ({ isLoading: true }));
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || err.message || 'Login failed'); }
      const data = await res.json();
      set(() => ({ currentUser: data.user, isAuthenticated: true, isLoading: false }));
    } catch (error) { set(() => ({ isLoading: false })); throw error; }
  },
  register: async (payload) => {
    set(() => ({ isLoading: true }));
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || err.message || 'Registration failed'); }
      const data = await res.json();
      set(() => ({ currentUser: null, isAuthenticated: false, isLoading: false }));
      return data;
    } catch (error) { set(() => ({ isLoading: false })); throw error; }
  },
  logout: () => { set(() => ({ currentUser: null, isAuthenticated: false, currentPage: 'home' as PageType, previousPages: [] })); },
  updateCurrentUser: (patch) => {
    set((state) => ({ currentUser: state.currentUser ? { ...state.currentUser, ...patch } : null }));
  },
});

interface NavSlice {
  currentPage: PageType;
  previousPages: PageType[];
  pendingChatUserId: string | null;
  pendingJobId: string | null;
  navigateTo: (page: PageType) => void;
  goBack: () => void;
  isPublicPage: () => boolean;
  isRoleAllowed: (page: PageType) => boolean;
  syncFromHash: () => void;
  setPendingJobId: (jobId: string | null) => void;
}

const createNavSlice = (
  set: (fn: (state: AppStore) => Partial<AppStore>) => void,
  get: () => AppStore,
): NavSlice => ({
  currentPage: 'home',
  previousPages: [],
  pendingChatUserId: null,
  pendingJobId: null,
  navigateTo: (page: PageType) => {
    const { currentPage } = get();
    if (page === currentPage) return;
    set(() => ({ previousPages: [...get().previousPages.slice(-20), currentPage], currentPage: page }));
    if (typeof window !== 'undefined') {
      window.history.pushState({ page }, '', '#' + page);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  },
  goBack: () => {
    const { previousPages } = get();
    if (previousPages.length === 0) return;
    const previous = previousPages[previousPages.length - 1];
    set(() => ({ previousPages: previousPages.slice(0, -1), currentPage: previous }));
    if (typeof window !== 'undefined') {
      window.history.back();
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  },
  isPublicPage: () => PUBLIC_PAGES.has(get().currentPage),
  isRoleAllowed: (page: PageType) => {
    const role = get().currentUser?.role;
    if (!role) return false;
    const effRole = effectiveRole(role);
    const allowed = ROLE_PAGE_MAP[effRole];
    if (!allowed) return false;
    return allowed.has(page);
  },
  syncFromHash: () => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('careers')) {
      set(() => ({ currentPage: 'careers' as PageType }));
      return;
    }
    if (hash && VALID_PAGES.has(hash as PageType)) {
      set(() => ({ currentPage: hash as PageType }));
    }
  },
  setPendingJobId: (jobId) => { set(() => ({ pendingJobId: jobId })); },
});

interface UISlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  activeModal: string | null;
  openModal: (modal: string | null) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const createUISlice = (
  set: (fn: (state: AppStore) => Partial<AppStore>) => void,
  get: () => AppStore,
): UISlice => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set(() => ({ sidebarOpen: open })),
  activeModal: null,
  openModal: (modal: string | null) => set(() => ({ activeModal: modal })),
  toasts: [],
  addToast: (toast) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => { get().removeToast(id); }, 5000);
  },
  removeToast: (id: string) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
});

type DataCacheKey = 'agents' | 'jobPosts' | 'jobApplications' | 'placements' | 'providers' | 'salaryDates' | 'notifications' | 'auditLogs';

interface DataSlice {
  agents: Agent[] | null;
  jobPosts: JobPost[] | null;
  jobApplications: JobApplication[] | null;
  placements: Placement[] | null;
  providers: Provider[] | null;
  salaryDates: SalaryDate[] | null;
  notifications: Notification[] | null;
  auditLogs: AuditLog[] | null;
  setData: (key: DataCacheKey, data: unknown) => void;
  getData: (key: DataCacheKey) => unknown;
}

const createDataSlice = (
  set: (fn: (state: AppStore) => Partial<AppStore>) => void,
): DataSlice => ({
  agents: null, jobPosts: null, jobApplications: null, placements: null,
  providers: null, salaryDates: null, notifications: null, auditLogs: null,
  setData: (key, data) => set(() => ({ [key]: data })),
  getData: (key) => { const store = useAppStore.getState(); return (store as Record<string, unknown>)[key] ?? null; },
});

export type AppStore = AuthSlice & NavSlice & UISlice & DataSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createAuthSlice(args[0]),
      ...createNavSlice(args[0], args[1]),
      ...createUISlice(args[0], args[1]),
      ...createDataSlice(args[0]),
    }),
    {
      name: 'gig-solutions-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        currentPage: state.currentPage,
        previousPages: state.previousPages,
        pendingJobId: state.pendingJobId,
      }),
    }
  )
);
