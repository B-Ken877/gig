// Types aligned with the new Gig Solutions philosophy (video assessments).

export type PageType =
  | 'home' | 'services' | 'careers' | 'about' | 'contact' | 'academy'
  | 'login' | 'register-agent'
  | 'agent-dashboard' | 'agent-profile' | 'agent-documents' | 'agent-availability' | 'agent-applications'
  | 'agent-verify-id'
  | 'agent-my-work'
  | 'admin-dashboard' | 'admin-users' | 'admin-job-posts' | 'admin-providers'
  | 'admin-placements' | 'admin-salary-dates' | 'admin-verifications'
  | 'messages' | 'support' | 'tickets' | 'pending-payment';

export type UserRole = 'visitor' | 'agent' | 'admin';

export type AgentStatus = 'Available' | 'Inactive';
export type AccountStatus = 'active' | 'pending_approval' | 'rejected' | 'suspended';

export interface User {
  id: string; email: string; name: string; role: UserRole;
  phone?: string; avatar?: string; isActive: boolean;
  accountStatus: AccountStatus;
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

export interface Provider {
  id: string; name: string; phone?: string; email?: string; notes?: string;
  createdAt: string; updatedAt: string;
  _count?: { jobPosts: number };
}

export interface JobPost {
  id: string;
  jobTitle: string;
  description: string;
  skills: string[];
  requirements: string[];
  hourlyRate: number;
  payFrequency: string;
  category?: string;
  shift?: string;
  location?: string;
  providerId?: string;
  commission: number;
  assessmentQuestions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { applications: number; placements: number };
}

export interface VideoResponse {
  id: string;
  applicationId: string;
  questionIndex: number;
  questionText: string;
  videoUrl: string;
  durationSeconds?: number;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  agentId: string;
  jobPostId: string;
  status: 'applied' | 'hired' | 'rejected';
  coverMessage?: string;
  createdAt: string;
  updatedAt: string;
  jobPost?: JobPost;
  agent?: Agent;
  videoResponses?: VideoResponse[];
  videoCount?: number;
}

export interface Placement {
  id: string;
  agentId: string;
  jobPostId: string;
  position: string;
  startDate?: string;
  endDate?: string;
  salary?: number;
  nextSalaryDate?: string;
  status: 'active' | 'completed' | 'terminated';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  jobPost?: JobPost;
  agent?: Agent;
}

export interface SalaryDate {
  id: string;
  payDate: string;
  frequency: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
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
  id: string; agentId?: string;
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
