'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useAppStore, authFetch } from '@/lib/store';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import {
  MessageSquare,
  Send,
  Plus,
  Search,
  ArrowLeft,
  Shield,
  Briefcase,
  Users,
  UserCog,
  Building2,
  DollarSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  VerifiedBadge,
  VerifiedBadgeStyles,
  topVerificationTier,
  type VerificationTier,
} from '@/components/ui/verified-badge';
import { UserProfileModal } from '@/components/ui/user-profile-modal';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface OtherUser {
  id?: string | null;
  name: string;
  role: string;
  avatar?: string | null;
  verificationTiers?: string[] | null;
  verifiedAt?: string | null;
}

interface LatestMessage {
  id: string;
  content: string;
  senderId: string;
  senderRole: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  user1Id: string;
  user2Id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  otherUser: OtherUser;
  latestMessage: LatestMessage | null;
  createdAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SearchableUser {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string | null;
  // For client users, the call center name to display (instead of personal name).
  companyName?: string | null;
  industry?: string | null;
  displayName?: string | null;
  // Verification badges (so the new-conversation dialog can show the seal)
  verificationTiers?: string[] | null;
  verifiedAt?: string | null;
}

// ──────────────────────────────────────────────────────────────
// Role helpers
// ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  client: 'Call Center',
  agent: 'Agent',
  payment_taker: 'Payment Team',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  client: 'bg-teal-100 text-teal-700',
  agent: 'bg-green-100 text-green-700',
  payment_taker: 'bg-amber-100 text-amber-700',
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  admin: Shield,
  client: Building2,
  agent: Users,
  payment_taker: DollarSign,
};

// Determine which roles the current user can message
// ──────────────────────────────────────────────────────
// RULE (per product spec):
//   - Agents can ONLY message other agents (and admin for support).
//     They must NOT be able to contact call centers via "New Message".
//     Agents reach call centers only by applying to a job posting,
//     which creates a conversation implicitly — but they cannot start
//     a new one manually from the dialog.
//   - Call centers can message agents, admins, and other call centers.
//   - Admin can message everyone.
function getAllowedRoles(myRole: string): string[] {
  if (myRole === 'admin') return ['admin', 'client', 'agent', 'payment_taker'];
  if (myRole === 'agent') return ['agent']; // ← AGENTS SEE AGENTS ONLY
  if (myRole === 'client') return ['admin', 'agent', 'client'];
  return ['admin', 'agent', 'client'];
}

// ──────────────────────────────────────────────────────────────
// Time formatting helpers
// ──────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ──────────────────────────────────────────────────────────────
// Skeleton loaders
// ──────────────────────────────────────────────────────────────

function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-50"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageListSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex gap-2',
            i % 2 === 0 ? 'flex-row' : 'flex-row-reverse',
          )}
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="max-w-[70%] space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// New Conversation Dialog — searches users by role
// ──────────────────────────────────────────────────────────────

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myRole: string;
  onSelect: (recipientUserId: string) => void;
  onShowProfile?: (userId: string) => void;
}

function NewConversationDialog({
  open,
  onOpenChange,
  myRole,
  onSelect,
  onShowProfile,
}: NewConversationDialogProps) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<SearchableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState<string | null>(null);

  const allowedRoles = useMemo(() => getAllowedRoles(myRole), [myRole]);

  // Fetch users when dialog opens
  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveRoleTab(null);
      setLoading(true);
      authFetch('/api/messages/search-users')
        .then((r) => r.json())
        .then((data) => {
          const list = data.users || [];
          if (Array.isArray(list)) {
            setUsers(list);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setUsers([]);
      setSearch('');
    }
  }, [open]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const filtered = useMemo(() => {
    let result = users;
    if (activeRoleTab) result = result.filter((u) => u.role === activeRoleTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) => {
          // Search against the display name (company name for clients) and email
          const dn = (u.displayName || u.name || '').toLowerCase();
          return dn.includes(q) || u.email.toLowerCase().includes(q);
        },
      );
    }
    return result;
  }, [users, activeRoleTab, search]);

  // Group users by role for the tab counts
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) {
      if (allowedRoles.includes(u.role)) {
        counts[u.role] = (counts[u.role] || 0) + 1;
      }
    }
    return counts;
  }, [users, allowedRoles]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <VerifiedBadgeStyles />
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Search for a team member to start messaging.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveRoleTab(null)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              !activeRoleTab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            All
          </button>
          {allowedRoles.map((role) => {
            const Icon = ROLE_ICONS[role] || Users;
            return (
              <button
                key={role}
                onClick={() => setActiveRoleTab(activeRoleTab === role ? null : role)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  activeRoleTab === role ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                <Icon className="h-3 w-3" />
                {ROLE_LABELS[role] || role}
                {roleCounts[role] ? ` (${roleCounts[role]})` : ''}
              </button>
            );
          })}
        </div>

        {/* User list */}
        <ScrollArea className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg p-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <MessageSquare className="mb-2 h-8 w-8" />
              <p className="text-sm">
                {users.length === 0 ? 'No users found.' : 'No matches found.'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 p-1">
              {filtered.map((user) => {
                const RoleIcon = ROLE_ICONS[user.role] || Users;
                const userDisplayName = user.displayName || (user.role === 'client' && user.companyName ? user.companyName : user.name);
                const userTiers: VerificationTier[] = (user.verificationTiers || []) as VerificationTier[];
                const userTopTier = topVerificationTier(userTiers);
                return (
                  <div
                    key={user.id}
                    onClick={() => {
                      onSelect(user.id);
                      onOpenChange(false);
                      setSearch('');
                    }}
                    className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-gray-50 cursor-pointer"
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onShowProfile?.(user.id); }}
                      className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
                      title="View full profile"
                    >
                      <Avatar className="h-9 w-9">
                        {user.avatar && <AvatarImage src={user.avatar} alt={userDisplayName} />}
                        <AvatarFallback className="bg-gray-200 text-gray-600 text-xs font-medium">
                          {getInitials(userDisplayName)}
                        </AvatarFallback>
                      </Avatar>
                      {userTopTier && (
                        <span className="absolute -bottom-1 -right-1">
                          <VerifiedBadge tier={userTopTier} iconOnly size="xs" verifiedAt={user.verifiedAt} />
                        </span>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onShowProfile?.(user.id); }}
                          className="truncate text-sm font-medium text-gray-900 hover:text-[#16A34A] hover:underline cursor-pointer"
                          title="View full profile"
                        >
                          {userDisplayName}
                        </button>
                        <Badge className={cn('shrink-0 text-[10px] px-1.5 py-0 h-4 font-medium', ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600')}>
                          <RoleIcon className="h-2.5 w-2.5 mr-0.5" />
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────
// Message Bubble
// ──────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  otherUser: OtherUser;
  onShowProfile?: (userId: string) => void;
}

function MessageBubble({ message, isOwn, otherUser, onShowProfile }: MessageBubbleProps) {
  const otherTiers: VerificationTier[] = (otherUser.verificationTiers || []) as VerificationTier[];
  const otherTopTier = topVerificationTier(otherTiers);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isOwn && (
        <button
          type="button"
          onClick={() => onShowProfile?.((otherUser as any).id)}
          className="relative mt-auto shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
          title="View full profile"
        >
          <Avatar className="h-8 w-8">
            {otherUser.avatar && <AvatarImage src={otherUser.avatar} />}
            <AvatarFallback className="bg-gray-200 text-gray-600 text-xs font-medium">
              {getInitials(otherUser.name)}
            </AvatarFallback>
          </Avatar>
          {otherTopTier && (
            <span className="absolute -bottom-1 -right-1">
              <VerifiedBadge tier={otherTopTier} iconOnly size="xs" verifiedAt={otherUser.verifiedAt} />
            </span>
          )}
        </button>
      )}

      <div
        className={cn(
          'max-w-[75%] sm:max-w-[65%]',
          isOwn ? 'items-end' : 'items-start',
        )}
      >
        {!isOwn && (
          <div className="mb-1 flex items-center gap-1.5 px-1">
            <button
              type="button"
              onClick={() => onShowProfile?.((otherUser as any).id)}
              className="text-xs font-medium text-gray-500 hover:text-[#16A34A] hover:underline cursor-pointer"
              title="View full profile"
            >
              {otherUser.name}
            </button>
            <Badge className={cn('text-[10px] px-1.5 py-0 h-3.5 font-medium leading-none', ROLE_COLORS[otherUser.role] || 'bg-gray-100 text-gray-600')}>
              {ROLE_LABELS[otherUser.role] || otherUser.role}
            </Badge>
          </div>
        )}

        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
            isOwn
              ? 'rounded-br-md bg-green-500 text-white'
              : 'rounded-bl-md bg-gray-100 text-gray-900',
          )}
        >
          {message.content}
        </div>

        <p
          className={cn(
            'mt-1 px-1 text-[11px] text-gray-400',
            isOwn && 'text-right',
          )}
        >
          {formatMessageTime(message.createdAt)}
          {isOwn && message.isRead && (
            <span className="ml-1 text-green-500">✓✓</span>
          )}
        </p>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// Conversation Item
// ──────────────────────────────────────────────────────────────

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onShowProfile?: (userId: string) => void;
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  onShowProfile,
}: ConversationItemProps) {
  const { otherUser, latestMessage, unreadCount, lastMessageAt } = conversation;
  const RoleIcon = ROLE_ICONS[otherUser.role] || Users;
  const otherTiers: VerificationTier[] = (otherUser.verificationTiers || []) as VerificationTier[];
  const otherTopTier = topVerificationTier(otherTiers);

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors cursor-pointer',
        isActive
          ? 'border-l-4 border-green-500 bg-green-50'
          : 'border-l-4 border-transparent hover:bg-gray-50',
      )}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onShowProfile?.((otherUser as any).id); }}
        className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
        title="View full profile"
      >
        <Avatar className="h-11 w-11">
          {otherUser.avatar && <AvatarImage src={otherUser.avatar} />}
          <AvatarFallback
            className={cn(
              'text-sm font-semibold',
              isActive
                ? 'bg-green-200 text-green-800'
                : 'bg-gray-200 text-gray-600',
            )}
          >
            {getInitials(otherUser.name)}
          </AvatarFallback>
        </Avatar>
        {otherTopTier && (
          <span className="absolute -bottom-1 -right-1">
            <VerifiedBadge tier={otherTopTier} iconOnly size="xs" verifiedAt={otherUser.verifiedAt} />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onShowProfile?.((otherUser as any).id); }}
              className={cn(
                'truncate text-sm font-semibold hover:underline cursor-pointer',
                isActive ? 'text-green-900 hover:text-green-700' : 'text-gray-900 hover:text-[#16A34A]',
              )}
              title="View full profile"
            >
              {otherUser.name}
            </button>
            <RoleIcon className={cn('h-3 w-3 shrink-0', isActive ? 'text-green-600' : 'text-gray-400')} />
          </div>
          {lastMessageAt && (
            <span
              className={cn(
                'shrink-0 text-[11px]',
                isActive ? 'text-green-600' : 'text-gray-400',
              )}
            >
              {formatTimeAgo(lastMessageAt)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-gray-500">
            {latestMessage
              ? latestMessage.content.length > 42
                ? latestMessage.content.substring(0, 42) + '...'
                : latestMessage.content
              : 'No messages yet'}
          </p>
          {unreadCount > 0 && (
            <Badge className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-green-500 px-1.5 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { currentUser, pendingChatUserId } = useAppStore();

  // Conversations list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);

  // Selected conversation & messages
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Message input
  const [inputValue, setInputValue] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // New conversation dialog
  const [newConvOpen, setNewConvOpen] = useState(false);

  // Mobile view toggle
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Other user info for active conversation
  const [activeOtherUser, setActiveOtherUser] = useState<OtherUser | null>(null);

  // ── Profile modal target (click name/avatar → full profile) ──
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = currentUser?.id || '';
  const myRole = currentUser?.role || 'visitor';

  // ── Fetch conversations ─────────────────────────────────────

  const fetchConversations = useCallback(() => {
    if (!userId) return;

    authFetch(`/api/messages?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.conversations) {
          setConversations(data.conversations);
        }
      })
      .catch(() => {})
      .finally(() => setConversationsLoading(false));
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);


  // ── Fetch messages for active conversation ──────────────────

  const fetchMessages = useCallback((convId: string) => {
    setMessagesLoading(true);
    authFetch(`/api/messages?conversationId=${convId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages);
        }
      })
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
  }, []);

  useEffect(() => {
    if (!activeConvId) return;
    fetchMessages(activeConvId);
  }, [activeConvId, fetchMessages]);

  // ── Polling for new messages ────────────────────────────────

  useEffect(() => {
    if (!activeConvId) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(() => {
      // Poll messages for active conversation
      authFetch(`/api/messages?conversationId=${activeConvId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.messages) {
            setMessages((prev) => {
              if (data.messages.length > prev.length) return data.messages;
              return prev;
            });
          }
        })
        .catch(() => {});

      // Refresh conversation list for unread counts
      authFetch(`/api/messages?userId=${userId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.conversations) setConversations(data.conversations);
        })
        .catch(() => {});
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [activeConvId, userId]);

  // ── Auto-scroll to bottom ───────────────────────────────────

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Select conversation ─────────────────────────────────────

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setActiveConvId(conv.id);
    setActiveOtherUser(conv.otherUser);
    setMessages([]);
    setMobileShowChat(true);
  }, []);

  // Auto-select conversation when navigating from View Application
  const pendingRef = useRef(pendingChatUserId);
  useEffect(() => {
    if (pendingRef.current && conversations.length > 0) {
      const targetConv = conversations.find(
        (c) => c.user1Id === pendingRef.current || c.user2Id === pendingRef.current
      );
      if (targetConv) {
        handleSelectConversation(targetConv);
      }
      pendingRef.current = null;
      useAppStore.getState().pendingChatUserId = null;
    }
  }, [conversations, handleSelectConversation]);

  // ── Send message ────────────────────────────────────────────

  const handleSendMessage = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !activeConvId || sendingMessage) return;

    setSendingMessage(true);

    try {
      const res = await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvId,
          content: trimmed,
        }),
      });

      if (res.ok) {
        setInputValue('');
        fetchMessages(activeConvId);
        fetchConversations();
      }
    } catch {
      // silent
    } finally {
      setSendingMessage(false);
      inputRef.current?.focus();
    }
  }, [inputValue, activeConvId, sendingMessage, fetchMessages, fetchConversations]);

  // ── Handle new conversation from dialog ───────────────────

  const handleNewConversation = useCallback(
    (recipientUserId: string) => {
      // Check if conversation already exists
      const existing = conversations.find(
        (c) =>
          (c.user1Id === userId && c.user2Id === recipientUserId) ||
          (c.user1Id === recipientUserId && c.user2Id === userId),
      );
      if (existing) {
        handleSelectConversation(existing);
        return;
      }

      // Create new conversation by sending a greeting
      authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId,
          content: 'Hello! I wanted to reach out.',
        }),
      })
        .then((r) => {
          if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Failed'); });
          return r.json();
        })
        .then((data) => {
          if (data.conversationId) {
            authFetch(`/api/messages?userId=${userId}`)
              .then((r) => r.json())
              .then((convData) => {
                if (convData.conversations) {
                  setConversations(convData.conversations);
                  const newConv = convData.conversations.find(
                    (c: Conversation) => c.id === data.conversationId,
                  );
                  if (newConv) handleSelectConversation(newConv);
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    },
    [conversations, userId, handleSelectConversation],
  );

  // ── Filtered conversations ─────────────────────────────────

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.otherUser.name.toLowerCase().includes(q) ||
        (ROLE_LABELS[c.otherUser.role] || '').toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q)),
    );
  }, [conversations, searchQuery]);

  // ── Render ──────────────────────────────────────────────────

  if (!currentUser) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-500">Please log in to view messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <VerifiedBadgeStyles />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Communicate with your team members.
          </p>
        </div>
        <Button
          onClick={() => setNewConvOpen(true)}
          className="gap-2 bg-green-500 text-white hover:bg-green-600"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Message</span>
        </Button>
      </div>

      {/* Chat Container */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="flex h-[calc(75vh-4rem)] min-h-[480px] flex-col lg:flex-row">
          {/* ── Left Sidebar: Conversation List ── */}
          <div
            className={cn(
              'flex w-full flex-col border-r border-gray-100 lg:w-[340px] xl:w-[380px]',
              mobileShowChat ? 'hidden lg:flex' : 'flex',
            )}
          >
            {/* Search */}
            <div className="border-b border-gray-100 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-gray-200 bg-gray-50 pl-9 text-sm"
                />
              </div>
            </div>

            {/* Conversation list */}
            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <ConversationListSkeleton />
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <MessageSquare className="mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">
                    No conversations yet.
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Start a new conversation using the button above.
                  </p>
                </div>
              ) : (
                <div className="p-1.5">
                  <AnimatePresence initial={false}>
                    {filteredConversations.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConvId}
                        onClick={() => handleSelectConversation(conv)}
                        onShowProfile={setProfileUserId}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ── Right Panel: Chat Messages ── */}
          <div
            className={cn(
              'flex flex-1 flex-col bg-gray-50 overflow-hidden',
              !mobileShowChat ? 'hidden lg:flex' : 'flex',
            )}
          >
            {!activeConvId ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <MessageSquare className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-700">
                  Select a conversation
                </h3>
                <p className="mt-1 max-w-xs text-sm text-gray-400">
                  Choose a conversation from the list or start a new one.
                </p>
              </div>
            ) : (
              <>
                {/* ── Chat Header ── */}
                <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 lg:hidden"
                    onClick={() => setMobileShowChat(false)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => activeOtherUser && setProfileUserId((activeOtherUser as any).id)}
                    className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
                    title="View full profile"
                  >
                    <Avatar className="h-9 w-9">
                      {activeOtherUser?.avatar && (
                        <AvatarImage src={activeOtherUser.avatar} />
                      )}
                      <AvatarFallback className="bg-green-100 text-green-700 text-sm font-semibold">
                        {activeOtherUser ? getInitials(activeOtherUser.name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    {activeOtherUser && topVerificationTier((activeOtherUser.verificationTiers || []) as VerificationTier[]) && (
                      <span className="absolute -bottom-1 -right-1">
                        <VerifiedBadge
                          tier={topVerificationTier((activeOtherUser.verificationTiers || []) as VerificationTier[])!}
                          iconOnly
                          size="xs"
                          verifiedAt={activeOtherUser.verifiedAt}
                        />
                      </span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => activeOtherUser && setProfileUserId((activeOtherUser as any).id)}
                      className="truncate text-sm font-semibold text-gray-900 hover:text-[#16A34A] hover:underline cursor-pointer block w-full text-left"
                      title="View full profile"
                    >
                      {activeOtherUser?.name || 'Conversation'}
                    </button>
                    {activeOtherUser && (
                      <Badge className={cn('text-[10px] px-1.5 py-0 h-3.5 font-medium leading-none', ROLE_COLORS[activeOtherUser.role] || 'bg-gray-100 text-gray-600')}>
                        {ROLE_LABELS[activeOtherUser.role] || activeOtherUser.role}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* ── Messages Area ── */}
                <ScrollArea className="flex-1 min-h-0 px-4 py-4">
                  {messagesLoading ? (
                    <MessageListSkeleton />
                  ) : messages.length === 0 ? (
                    <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                      <MessageSquare className="mb-3 h-10 w-10 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">
                        No messages yet.
                      </p>
                      <p className="mt-1 text-xs text-gray-400">Say hello!</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={msg.senderId === currentUser.id}
                            otherUser={
                              activeOtherUser || { name: 'Unknown', role: 'visitor' }
                            }
                            onShowProfile={setProfileUserId}
                          />
                        ))}
                      </AnimatePresence>
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* ── Message Input ── */}
                <Separator />
                <div className="border-t border-gray-200 bg-white p-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 border-gray-200 bg-gray-50 text-sm"
                      disabled={sendingMessage}
                      aria-label="Message input"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!inputValue.trim() || sendingMessage}
                      className="shrink-0 h-10 w-10 bg-green-500 text-white hover:bg-green-600 disabled:opacity-40"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ── New Conversation Dialog ── */}
      <NewConversationDialog
        open={newConvOpen}
        onOpenChange={setNewConvOpen}
        myRole={myRole}
        onSelect={handleNewConversation}
        onShowProfile={setProfileUserId}
      />
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}
