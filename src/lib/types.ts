// Types aligned with Prisma schema for Gig Solutions

export type PageType =
  | 'home' | 'services' | 'for-clients' | 'careers' | 'about' | 'contact'
  | 'login' | 'register' | 'register-agent' | 'register-client'
  | 'agent-dashboard' | 'agent-profile' | 'agent-documents' | 'agent-availability' | 'agent-applications'
  | 'client-dashboard' | 'client-agents' | 'client-needs' | 'client-jobs' | 'client-applications' | 'client-profile'
  | 'admin-dashboard' | 'admin-users' | 'admin-job-posts'
  | 'payment-taker-dashboard'
  | 'messages'
  | 'pending-payment'
  | 'support'
  | 'tickets'
  | 'reviews';

export type UserRole = 'visitor' | 'agent' | 'client' | 'payment_taker' | 'admin';

export type AgentStatus = 'Available' | 'Inactive';
export type AccountStatus = 'active' | 'pending_approval' | 'rejected' | 'suspended';
export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string; email: string; name: string; role: UserRole;
  phone?: string; avatar?: string; isActive: boolean;
  accountStatus: AccountStatus;
  // Verification + Gig Score (premium badges)
  verificationTiers?: string[];
  verifiedAt?: string | null;
  gigScore?: number;
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

// ─── Reviews (Trustpilot-style) ──────────────────────────────────────────
export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;          // 1–5
  title?: string | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields (returned by /api/reviews)
  reviewer?: {
    id: string;
    name: string;
    role: string;
    avatar?: string | null;
    // For call-center reviewers, surface the company name
    companyName?: string | null;
  };
}

// Search hit for the Reviews "find an agent or call center" box
export interface ReviewableUser {
  id: string;
  name: string;             // for agents: user.name; for clients: companyName
  role: UserRole;
  avatar?: string | null;
  // Aggregate rating stats (null if no reviews yet)
  avgRating?: number | null;
  reviewCount?: number;
  // Optional enrichments
  industry?: string | null;     // clients only
  country?: string | null;      // agents only
  skills?: string[];            // agents only
}
