import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PageType, User, Agent, Client, JobPost, CallCenterNeed,
  PaymentRequest, Notification, AuditLog, ToastMessage, UserRole,
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
  'home', 'services', 'for-clients', 'careers', 'about', 'contact', 'academy',
  'login', 'register-agent', 'register-client', 'pending-payment',
]);

const VALID_PAGES: ReadonlySet<PageType> = new Set<PageType>([
  'home','services','for-clients','careers','about','contact','academy',
  'login','register-agent','register-client','pending-payment',
  'agent-dashboard','agent-profile','agent-documents','agent-availability','agent-applications',
  'client-dashboard','client-agents','client-needs','client-jobs','client-applications','client-profile',
  'admin-dashboard','admin-users','admin-job-posts',
  'payment-taker-dashboard','messages','group-chat','support','tickets','reviews',
]);

// FEATURE: Role-based page access control
// NOTE: payment_taker role is now MERGED into admin — same person handles both.
// Any user whose DB role is 'payment_taker' is treated as 'admin' for nav/permissions.
// (See `effectiveRole` helper below — also applied at login in /api/auth/login.)
function effectiveRole(role: string | undefined): UserRole {
  if (!role) return 'visitor';
  if (role === 'payment_taker') return 'admin';
  return role as UserRole;
}

const ROLE_PAGE_MAP: Partial<Record<UserRole, ReadonlySet<PageType>>> = {
  agent: new Set(['agent-dashboard','agent-profile','agent-documents','agent-availability','agent-applications','academy','ai-training','marketplace','messages','group-chat','support','pending-payment','reviews']),
  client: new Set(['client-dashboard','client-agents','client-needs','client-jobs','client-applications','client-profile','academy','ai-training','marketplace','messages','group-chat','support','pending-payment','reviews']),
  // Admin = merged admin + payment_taker. One session, full access.
  admin: new Set([
    'admin-dashboard','admin-users','admin-job-posts','admin-products',
    'payment-taker-dashboard','academy','messages','tickets','support','reviews','group-chat',
  ]),
  // Legacy: payment_taker in DB is treated as admin (effectiveRole remaps it).
  payment_taker: new Set([
    'payment-taker-dashboard','admin-dashboard','admin-users','admin-job-posts',
    'academy','messages','tickets','support','reviews','group-chat',
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
    clientProfile?: Record<string, unknown>;
  }) => Promise<{ message?: string; requiresApproval?: boolean; userId?: string }>;
  logout: () => void;
  // Update the current user in-place (used after avatar upload, profile edits,
  // verification grants, etc.) without requiring a full re-login.
  updateCurrentUser: (patch: Partial<User>) => void;
}

const createAuthSlice = (
  set: (fn: (state: AppStore) => Partial<AppStore>) => void,
  get: () => AppStore,
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
  // Reviews: when the user clicks "Reviews" on an agent card or profile,
  // we stash the target user id here so the ReviewsPage knows whose reviews
  // to load + whether to auto-scroll to the "leave a review" form.
  pendingReviewUserId: string | null;
  pendingReviewScrollToForm: boolean;
  // Group chat: when the client hires an agent from the Applications page,
  // we stash the group chat id returned by /api/applications/hire here so
  // the GroupChatPage can auto-open that specific per-job chat thread.
  pendingGroupChatId: string | null;
  navigateTo: (page: PageType) => void;
  goBack: () => void;
  isPublicPage: () => boolean;
  isRoleAllowed: (page: PageType) => boolean;
  syncFromHash: () => void;
  setPendingReviewUserId: (userId: string | null, scrollToForm?: boolean) => void;
  setPendingGroupChatId: (chatId: string | null) => void;
  clearPendingGroupChatId: () => void;
}

const createNavSlice = (
  set: (fn: (state: AppStore) => Partial<AppStore>) => void,
  get: () => AppStore,
): NavSlice => ({
  currentPage: 'home',
  previousPages: [],
  pendingChatUserId: null,
  pendingReviewUserId: null,
  pendingReviewScrollToForm: false,
  pendingGroupChatId: null,
  navigateTo: (page: PageType) => {
    const { currentPage } = get();
    if (page === currentPage) return;
    // BUG FIX: Limit history depth to prevent memory growth
    set(() => ({ previousPages: [...get().previousPages.slice(-20), currentPage], currentPage: page }));
    if (typeof window !== 'undefined') {
      window.history.pushState({ page }, '', '#' + page);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  },
  // BUG FIX: goBack now properly pops from previousPages
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
    // Treat payment_taker as admin (merged role)
    const effRole = effectiveRole(role);
    const allowed = ROLE_PAGE_MAP[effRole] || ROLE_PAGE_MAP[role];
    if (!allowed) return false;
    return allowed.has(page);
  },
  // FEATURE: Hash-based routing on page load
  syncFromHash: () => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (hash && VALID_PAGES.has(hash as PageType)) {
      set(() => ({ currentPage: hash as PageType }));
    }
  },
  setPendingReviewUserId: (userId, scrollToForm = false) => {
    set(() => ({ pendingReviewUserId: userId, pendingReviewScrollToForm: scrollToForm }));
  },
  setPendingGroupChatId: (chatId) => {
    set(() => ({ pendingGroupChatId: chatId }));
  },
  clearPendingGroupChatId: () => {
    set(() => ({ pendingGroupChatId: null }));
  },
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

type DataCacheKey = 'agents' | 'clients' | 'jobPosts' | 'callCenterNeeds' | 'paymentRequests' | 'notifications' | 'auditLogs';

interface DataSlice {
  agents: Agent[] | null; clients: Client[] | null; jobPosts: JobPost[] | null;
  callCenterNeeds: CallCenterNeed[] | null; paymentRequests: PaymentRequest[] | null;
  notifications: Notification[] | null; auditLogs: AuditLog[] | null;
  setData: (key: DataCacheKey, data: unknown) => void;
  getData: (key: DataCacheKey) => unknown;
}

const createDataSlice = (
  set: (fn: (state: AppStore) => Partial<AppStore>) => void,
): DataSlice => ({
  agents: null, clients: null, jobPosts: null, callCenterNeeds: null,
  paymentRequests: null, notifications: null, auditLogs: null,
  setData: (key, data) => set(() => ({ [key]: data })),
  getData: (key) => { const store = useAppStore.getState(); return (store as Record<string, unknown>)[key] ?? null; },
});

export type AppStore = AuthSlice & NavSlice & UISlice & DataSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createAuthSlice(args[0], args[1]),
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
      }),
    }
  )
);

