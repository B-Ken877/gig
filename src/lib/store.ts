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
  'home', 'services', 'for-clients', 'careers', 'about', 'contact', 'login', 'register', 'register-agent', 'register-client', 'pending-payment',
]);

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
}

const createAuthSlice = (
  set: (fn: (state: AppStore) => Partial<AppStore>) => void,
  get: () => AppStore,
): AuthSlice => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set(() => ({ isLoading: true }));
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Login failed');
      }
      const data = await res.json();
      set(() => ({
        currentUser: data.user,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (error) {
      set(() => ({ isLoading: false }));
      throw error;
    }
  },

  register: async (payload) => {
    set(() => ({ isLoading: true }));
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Registration failed');
      }
      const data = await res.json();
      set(() => ({ currentUser: null, isAuthenticated: false, isLoading: false }));
      return data;
    } catch (error) {
      set(() => ({ isLoading: false }));
      throw error;
    }
  },

  logout: () => {
    set(() => ({
      currentUser: null, isAuthenticated: false,
      currentPage: 'home' as PageType, previousPages: [],
    }));
  },
});

interface NavSlice {
  currentPage: PageType;
  previousPages: PageType[];
  navigateTo: (page: PageType) => void;
  goBack: () => void;
  isPublicPage: () => boolean;
}

const createNavSlice = (
  set: (fn: (state: AppStore) => Partial<AppStore>) => void,
  get: () => AppStore,
): NavSlice => ({
  currentPage: 'home',
  previousPages: [],

  navigateTo: (page: PageType) => {
    const { currentPage } = get();
    if (page === currentPage) return;
    set(() => ({ previousPages: [...get().previousPages, currentPage], currentPage: page }));
    if (typeof window !== 'undefined') {
      window.history.pushState({ page }, '', '#' + page);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  },

  goBack: () => {
    const { previousPages } = get();
    if (previousPages.length === 0) return;
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) { window.history.back(); return; }
      const previous = previousPages[previousPages.length - 1];
      set(() => ({ previousPages: previousPages.slice(0, -1), currentPage: previous }));
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  },

  isPublicPage: () => PUBLIC_PAGES.has(get().currentPage),
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
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => { get().removeToast(id); }, 5000);
  },
  removeToast: (id: string) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
});

type DataCacheKey = 'agents' | 'clients' | 'jobPosts' | 'callCenterNeeds' | 'paymentRequests' | 'notifications' | 'auditLogs';

interface DataSlice {
  agents: Agent[] | null;
  clients: Client[] | null;
  jobPosts: JobPost[] | null;
  callCenterNeeds: CallCenterNeed[] | null;
  paymentRequests: PaymentRequest[] | null;
  notifications: Notification[] | null;
  auditLogs: AuditLog[] | null;
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