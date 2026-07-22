// Types aligned with Prisma schema for Gig Solutions

export type PageType =
  | 'home' | 'services' | 'for-clients' | 'careers' | 'about' | 'contact' | 'academy'
  | 'login' | 'register' | 'register-agent' | 'register-client'
  | 'agent-dashboard' | 'agent-profile' | 'agent-documents' | 'agent-availability' | 'agent-applications'
  | 'client-dashboard' | 'client-agents' | 'client-needs' | 'client-jobs' | 'client-applications' | 'client-profile'
  | 'admin-dashboard' | 'admin-users' | 'admin-job-posts'
  | 'payment-taker-dashboard'
  | 'messages'
  | 'group-chat'
  | 'pending-payment'
  | 'support'
  | 'tickets'
  | 'reviews'
  | 'ai-training'
  | 'marketplace'
  | 'admin-products'

export type UserRole = 'visitor' | 'agent' | 'client' | 'payment_taker' | 'admin';

export type AgentStatus = 'Available' | 'Inactive';
export type AccountStatus = 'active' | 'pending_approval' | 'rejected' | 'suspended';
export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string; email: string; name: string; role: UserRole;
  phone?: string; avatar?: string; isActive: boolean;
  accountStatus: AccountStatus;
  // Verification + Gig Score (premium badges). Populated by /api/auth/login
  // and /api/users — the UI renders badges immediately after login.
  verificationTiers?: string[];
  verifiedAt?: string | null;
  gigScore?: number;
  // ─── Subscription / Payment gating ────────────────────────────────────
  // `paid=true` + `paidUntil>now` is required for an agent to apply to a
  // job, and for a call center to access the "Job Links" tab. The admin
  // toggles this after approving a payment in the payment chat.
  paid?: boolean;
  paidUntil?: string | null;
  paymentTier?: string | null;
}

// A user that can be reviewed (agent or call center). Returned by
// /api/reviews?revieweeId=... and /api/reviews/search.
export interface ReviewableUser {
  id: string;
  name: string;
  role: 'agent' | 'client';
  avatar?: string | null;
  email?: string;
  accountStatus?: string;
  companyName?: string | null;
  industry?: string | null;
  country?: string | null;
  skills?: string[];
  verificationTiers?: string[];
  verifiedAt?: string | null;
  // Aggregate review stats (returned by search, not by the detail endpoint)
  avgRating?: number | null;
  reviewCount?: number;
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  title?: string | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
  reviewer?: {
    id: string;
    name: string;
    role: string;
    avatar?: string | null;
    companyName?: string | null;
    verificationTiers?: string[];
    verifiedAt?: string | null;
  } | null;
}

export interface Agent {
  id: string; userId: string; status: AgentStatus;
  country?: string; address?: string; dateOfBirth?: string;
  languages: string[]; experience: number; skills: string[];
  previousEmployers: string[]; education: string[];
  computerSpecs: Record<string, string>;
  ram?: string; processor?: string; internetSpeed?: string;
  backupInternet: boolean; headsetAvailable: boolean; upsAvailable: boolean;
  preferredShift?: string; salaryExpectation?: number; niu?: string;
  createdAt: string; updatedAt: string;
  user?: User; documents?: Document[];
  availabilitySlots?: AvailabilitySlot[];
}

export interface Client {
  id: string; userId: string; companyName: string;
  industry?: string; contactPerson?: string; phone?: string;
  billingAddress?: string; billingEmail?: string; taxId?: string;
  companyLink?: string;
  createdAt: string; updatedAt: string;
  user?: User;
}

export interface JobPost {
  id: string; clientId: string; companyName: string;
  companyLink?: string; jobTitle: string; description: string;
  isActive: boolean; createdAt: string; updatedAt: string;
}

export interface CallCenterNeed {
  id: string; clientId: string; title: string;
  description: string; requirements: string[];
  isActive: boolean; createdAt: string; updatedAt: string;
}

export interface PaymentRequest {
  id: string; userId: string; role: string;
  feeType: string; amount: number; currency: string;
  status: PaymentRequestStatus; handledBy?: string;
  createdAt: string; updatedAt: string;
  user?: User; handledByUser?: User;
}

export interface Document {
  id: string; agentId: string; type: string;
  fileName: string; fileUrl: string; fileSize?: number; mimeType?: string;
  version: number; downloadCount: number;
  createdAt: string; updatedAt: string;
  agent?: Agent;
}

export interface Notification {
  id: string; userId: string; channel: string;
  title: string; message: string; type?: string;
  isRead: boolean; createdAt: string; updatedAt: string;
}

export interface InternalNote {
  id: string; agentId?: string; clientId?: string;
  authorId: string; type: string;
  content: string; createdAt: string; updatedAt: string;
}

export interface AuditLog {
  id: string; userId?: string; action: string;
  entity?: string; entityId?: string; details?: string;
  ipAddress?: string; createdAt: string;
  user?: User;
}

export interface AvailabilitySlot {
  id: string; agentId: string; date: string;
  startTime?: string; endTime?: string;
  isAvailable: boolean;
  createdAt: string; updatedAt: string;
  agent?: Agent;
}

export interface ToastMessage {
  id: string; title?: string; description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

export interface DashboardStat {
  label: string; value: string | number; change?: string;
  icon?: string; trend?: 'up' | 'down' | 'neutral';
}
