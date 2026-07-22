'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UsersRound, Send, Plus, Search, Trash2, ArrowLeft, MessageCircle, Users, Building2, RefreshCw, Crown, Briefcase,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore, authFetch } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  VerifiedBadge, VerifiedBadgeStyles, topVerificationTier, type VerificationTier,
} from '@/components/ui/verified-badge';
import { UserProfileModal } from '@/components/ui/user-profile-modal';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
interface Member {
  id: string;
  userId: string;
  addedAt: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  isOwner?: boolean;
  verificationTiers?: string[];
  verifiedAt?: string | null;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole?: string | null;
  senderName?: string;
  senderAvatar?: string | null;
  senderTiers?: string[] | null;
  senderVerifiedAt?: string | null;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface ClientChatSummary {
  id: string;
  title: string;
  needId: string | null;
  needTitle: string | null;
  needActive: boolean | null;
  isLegacy: boolean;
  createdAt: string;
  updatedAt: string;
  ownerName: string;
  memberCount: number;
  members: Member[];
  latestMessage: {
    content: string;
    senderId: string;
    senderRole?: string | null;
    createdAt: string;
  } | null;
}

interface ChatThreadState {
  chat: {
    id: string;
    title: string;
    ownerName: string;
    ownerAvatar?: string | null;
    ownerTiers?: string[] | null;
    ownerVerifiedAt?: string | null;
    createdAt: string;
  };
  members: Member[];
  messages: ChatMessage[];
}

interface AgentChatSummary {
  id: string;
  title: string;
  needId: string | null;
  needTitle: string | null;
  isLegacy: boolean;
  ownerName: string;
  ownerAvatar?: string | null;
  ownerTiers?: string[] | null;
  ownerVerifiedAt?: string | null;
  memberCount: number;
  joinedAt: string;
  latestMessage: { content: string; senderId: string; createdAt: string } | null;
}

interface SearchUser {
  id: string; name: string; email: string; role: string; avatar?: string | null;
}

const POLL_MS = 8000;

export default function GroupChatPage() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role;

  if (role === 'client') return <ClientView />;
  if (role === 'agent') return <AgentView />;
  return (
    <Card><CardContent className="py-16 text-center text-gray-500">
      <UsersRound className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p>Team Chat is only available to call centers and agents.</p>
    </CardContent></Card>
  );
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function MemberAvatar({ member, size = 'h-8 w-8', onShowProfile }: { member: Member; size?: string; onShowProfile?: (userId: string) => void }) {
  const tiers: VerificationTier[] = (member.verificationTiers || []) as VerificationTier[];
  const topTier = topVerificationTier(tiers);
  return (
    <button
      type="button"
      onClick={() => onShowProfile?.(member.userId)}
      className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
      title="View full profile"
    >
      <Avatar className={cn(size, 'ring-2 ring-white shadow-sm')}>
        {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
        <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-xs font-semibold">
          {getInitials(member.name)}
        </AvatarFallback>
      </Avatar>
      {topTier && (
        <span className="absolute -bottom-1 -right-1">
          <VerifiedBadge tier={topTier} iconOnly size="xs" verifiedAt={member.verifiedAt} />
        </span>
      )}
    </button>
  );
}

function MessageBubble({ m, isMe, senderName, senderAvatar, senderTiers, senderVerifiedAt }: {
  m: ChatMessage; isMe: boolean; senderName: string; senderAvatar?: string | null;
  senderTiers?: string[] | null; senderVerifiedAt?: string | null;
}) {
  const tiers: VerificationTier[] = (senderTiers || []) as VerificationTier[];
  const topTier = topVerificationTier(tiers);
  return (
    <div className={cn('flex gap-2', isMe ? 'justify-end' : 'justify-start')}>
      {!isMe && (
        <div className="relative shrink-0 mt-0.5">
          <Avatar className="h-7 w-7">
            {senderAvatar && <AvatarImage src={senderAvatar} alt={senderName} />}
            <AvatarFallback className="bg-gray-200 text-gray-600 text-[10px] font-semibold">
              {getInitials(senderName)}
            </AvatarFallback>
          </Avatar>
          {topTier && (
            <span className="absolute -bottom-1 -right-1">
              <VerifiedBadge tier={topTier} iconOnly size="xs" verifiedAt={senderVerifiedAt} />
            </span>
          )}
        </div>
      )}
      <div className={cn('max-w-[75%] rounded-2xl px-4 py-2',
        isMe ? 'bg-[#16A34A] text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm')}>
        {!isMe && (
          <p className="text-[10px] font-semibold mb-0.5 text-gray-600">{senderName}</p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
        <p className={cn('text-[10px] mt-1', isMe ? 'text-green-100' : 'text-gray-400')}>
          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// CLIENT VIEW — list of per-job group chats + thread view
// ──────────────────────────────────────────────────────────────
function ClientView() {
  const { currentUser, addToast } = useAppStore();
  const [chats, setChats] = useState<ClientChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const pendingGroupChatId = useAppStore(s => s.pendingGroupChatId);
  const clearPendingGroupChatId = useAppStore(s => s.clearPendingGroupChatId);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await authFetch('/api/group-chat');
      if (!r.ok) throw new Error('Failed to load team chats');
      const d = await r.json();
      if (mountedRef.current) {
        setChats(d.groupChats || []);
        setError(null);
      }
    } catch (e: any) {
      if (mountedRef.current) setError(e?.message || 'Failed to load');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    pollRef.current = setInterval(load, POLL_MS);
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  // Auto-open a chat if pendingGroupChatId was set (e.g. after hire)
  useEffect(() => {
    if (pendingGroupChatId && chats.length > 0) {
      const exists = chats.find(c => c.id === pendingGroupChatId);
      if (exists) {
        setActiveChatId(pendingGroupChatId);
        clearPendingGroupChatId();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGroupChatId, chats.length]);

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
    </div>;
  }

  if (error) {
    return <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-8 text-center">
        <p className="text-sm font-medium text-red-700 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
      </CardContent>
    </Card>;
  }

  if (activeChatId) {
    const active = chats.find(c => c.id === activeChatId);
    return <ClientChatThread
      chatId={activeChatId}
      needTitle={active?.needTitle || null}
      isLegacy={active?.isLegacy || false}
      onBack={() => { setActiveChatId(null); load(); }}
      onMemberRemoved={load}
    />;
  }

  if (chats.length === 0) {
    return <Card><CardContent className="py-16 text-center">
      <UsersRound className="h-12 w-12 mx-auto text-gray-200 mb-3" />
      <h3 className="text-sm font-semibold text-gray-500 mb-1">No Team Chats Yet</h3>
      <p className="text-xs text-gray-400 max-w-sm mx-auto">
        When you hire an agent from the Applications page, a separate team chat will be
        created automatically for that specific job. Each job gets its own chat.
      </p>
    </CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <VerifiedBadgeStyles />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Team Chats</h2>
          <p className="text-xs text-gray-500">
            {chats.length} chat{chats.length !== 1 ? 's' : ''} · one per job posting
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
      </div>
      <div className="space-y-2">
        {chats.map(c => (
          <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveChatId(c.id)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Briefcase className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {c.needTitle || c.title}
                  {c.isLegacy && (
                    <Badge variant="outline" className="ml-2 text-[9px] text-gray-500">General</Badge>
                  )}
                  {c.needActive === false && (
                    <Badge variant="outline" className="ml-2 text-[9px] text-amber-600 border-amber-300">Closed</Badge>
                  )}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {c.latestMessage
                    ? c.latestMessage.content
                    : 'No messages yet — say hi to your team!'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge variant="secondary" className="text-[10px]">{c.memberCount} member{c.memberCount !== 1 ? 's' : ''}</Badge>
                {c.latestMessage && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(c.latestMessage.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// CLIENT CHAT THREAD — single per-job chat view for the owner
// ──────────────────────────────────────────────────────────────
function ClientChatThread({
  chatId, needTitle, isLegacy, onBack, onMemberRemoved,
}: {
  chatId: string;
  needTitle: string | null;
  isLegacy: boolean;
  onBack: () => void;
  onMemberRemoved: () => void;
}) {
  const { currentUser, addToast } = useAppStore();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [state, setState] = useState<ChatThreadState | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await authFetch('/api/group-chat/messages?groupChatId=' + encodeURIComponent(chatId));
      if (!r.ok) throw new Error('Failed to load');
      const d = await r.json();
      if (mountedRef.current) {
        setState({
          chat: d.chat,
          members: d.members || [],
          messages: d.messages || [],
        });
      }
    } catch {
      if (mountedRef.current) setState(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    pollRef.current = setInterval(load, POLL_MS);
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state?.messages.length]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft('');
    try {
      const r = await authFetch('/api/group-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupChatId: chatId, content }),
      });
      if (!r.ok) throw new Error('Failed to send');
      const d = await r.json();
      if (mountedRef.current && state) {
        setState({
          ...state,
          messages: [...state.messages, d.message],
        });
      }
      load();
    } catch {
      if (mountedRef.current) addToast({ title: 'Failed to send', variant: 'destructive' });
      setDraft(content);
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm('Remove ' + name + ' from this team chat?')) return;
    try {
      const r = await authFetch(
        '/api/group-chat/members?userId=' + encodeURIComponent(userId) + '&groupChatId=' + encodeURIComponent(chatId),
        { method: 'DELETE' },
      );
      if (!r.ok) throw new Error('Failed');
      addToast({ title: name + ' removed', variant: 'success' });
      onMemberRemoved();
      load();
    } catch {
      addToast({ title: 'Failed to remove', variant: 'destructive' });
    }
  };

  if (loading || !state) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
    </div>;
  }

  const me = currentUser;
  const { chat, members, messages } = state;
  const myName = me?.name || 'You';
  const headerLabel = needTitle || (isLegacy ? 'General Team Chat' : chat.title);

  return (
    <div className="space-y-3">
      <VerifiedBadgeStyles />
      <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500">
        <ArrowLeft className="h-4 w-4 mr-1.5" />Back to chats
      </Button>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {headerLabel}
              {isLegacy && <Badge variant="outline" className="text-[9px] text-gray-500">General</Badge>}
            </h2>
            <p className="text-xs text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />Add Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Chat area */}
        <Card className="flex flex-col h-[600px]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageCircle className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Say hi to your team for this job!</p>
              </div>
            ) : (
              messages.map(m => {
                const isMe = m.senderId === me?.id;
                const sender = members.find(x => x.userId === m.senderId);
                const senderName = isMe ? 'You' : (m.senderName || sender?.name || (m.senderRole === 'client' ? 'Call Center' : 'Agent'));
                const senderAvatar = isMe ? (me?.avatar || null) : (m.senderAvatar || sender?.avatar || null);
                const senderTiers = isMe ? (me?.verificationTiers || []) : (m.senderTiers || sender?.verificationTiers || []);
                const senderVerifiedAt = isMe ? (me?.verifiedAt || null) : (m.senderVerifiedAt || sender?.verifiedAt || null);
                return (
                  <MessageBubble
                    key={m.id}
                    m={m}
                    isMe={isMe}
                    senderName={senderName}
                    senderAvatar={senderAvatar}
                    senderTiers={senderTiers}
                    senderVerifiedAt={senderVerifiedAt}
            onShowProfile={setProfileUserId}
            senderId={m.senderId}
          />
                );
              })
            )}
          </div>
          <div className="border-t p-3 flex gap-2">
            <Input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message to your team..."
              disabled={sending}
            />
            <Button onClick={handleSend} disabled={sending || !draft.trim()} className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Members sidebar */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />Members
            </h3>
            <div className="space-y-2">
              {/* Owner (self) */}
              <div className="flex items-center gap-2 p-2 rounded-md bg-green-50">
                <button
                  type="button"
                  onClick={() => currentUser && setProfileUserId(currentUser.id)}
                  className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
                  title="View my profile"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                    {me?.avatar && <AvatarImage src={me.avatar} alt={myName} />}
                    <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-xs font-semibold">
                      {getInitials(myName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate flex items-center gap-1">
                    {myName}
                    <Crown className="h-3 w-3 text-amber-500" />
                  </p>
                  <p className="text-[10px] text-gray-500">Owner</p>
                </div>
              </div>
              {members.filter(m => !m.isOwner).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No agents added yet</p>
              ) : (
                members.filter(m => !m.isOwner).map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 group">
                    <MemberAvatar member={m}
              onShowProfile={setProfileUserId}
            />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{m.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                      onClick={() => handleRemoveMember(m.userId, m.name)}
                      title={'Remove ' + m.name}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AddAgentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={load}
        groupChatId={chatId}
      />
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// AGENT VIEW — list of group chats they're a member of
// ──────────────────────────────────────────────────────────────
function AgentView() {
  const { currentUser } = useAppStore();
  const [chats, setChats] = useState<AgentChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await authFetch('/api/group-chat');
      if (!r.ok) throw new Error('Failed to load');
      const d = await r.json();
      setChats(d.groupChats || []);
    } catch {
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
    </div>;
  }

  if (activeChatId) {
    return <AgentChatThread
      chatId={activeChatId}
      onBack={() => { setActiveChatId(null); load(); }}
    />;
  }

  if (chats.length === 0) {
    return <Card><CardContent className="py-16 text-center">
      <UsersRound className="h-12 w-12 mx-auto text-gray-200 mb-3" />
      <h3 className="text-sm font-semibold text-gray-500 mb-1">No Team Chats Yet</h3>
      <p className="text-xs text-gray-400 max-w-sm mx-auto">
        When a call center hires you, you&apos;ll be added to a team chat for that
        specific job. It will appear here.
      </p>
    </CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <VerifiedBadgeStyles />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Team Chats</h2>
          <p className="text-xs text-gray-500">{chats.length} chat{chats.length !== 1 ? 's' : ''} you&apos;re a member of</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
      </div>
      <div className="space-y-2">
        {chats.map(c => (
          <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveChatId(c.id)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Briefcase className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {c.ownerName}
                  {c.needTitle && <span className="text-gray-400 font-normal"> · {c.needTitle}</span>}
                  {c.isLegacy && !c.needTitle && (
                    <Badge variant="outline" className="ml-2 text-[9px] text-gray-500">General</Badge>
                  )}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {c.latestMessage
                    ? c.latestMessage.content
                    : 'No messages yet'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge variant="secondary" className="text-[10px]">{c.memberCount} members</Badge>
                {c.latestMessage && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(c.latestMessage.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}

function AgentChatThread({ chatId, onBack }: { chatId: string; onBack: () => void }) {
  const { currentUser, addToast } = useAppStore();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [state, setState] = useState<ChatThreadState | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await authFetch('/api/group-chat/messages?groupChatId=' + encodeURIComponent(chatId));
      if (!r.ok) throw new Error('Failed to load');
      const d = await r.json();
      if (mountedRef.current) {
        setState({
          chat: d.chat,
          members: d.members || [],
          messages: d.messages || [],
        });
      }
    } catch {
      if (mountedRef.current) setState(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    pollRef.current = setInterval(load, POLL_MS);
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state?.messages.length]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft('');
    try {
      const r = await authFetch('/api/group-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupChatId: chatId, content }),
      });
      if (!r.ok) throw new Error('Failed to send');
      const d = await r.json();
      if (mountedRef.current && state) {
        setState({
          ...state,
          messages: [...state.messages, d.message],
        });
      }
    } catch {
      addToast({ title: 'Failed to send', variant: 'destructive' });
      setDraft(content);
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  if (loading || !state) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
    </div>;
  }

  const me = currentUser;
  const { chat, members, messages } = state;

  return (
    <div className="space-y-3">
      <VerifiedBadgeStyles />
      <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500">
        <ArrowLeft className="h-4 w-4 mr-1.5" />Back to chats
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="flex flex-col h-[600px]">
          {/* Chat header with owner info */}
          <div className="border-b p-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => chat.ownerUserId && setProfileUserId(chat.ownerUserId)}
              className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
              title="View full profile"
            >
              <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                {chat.ownerAvatar && <AvatarImage src={chat.ownerAvatar} alt={chat.ownerName} />}
                <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-xs font-semibold">
                  {getInitials(chat.ownerName)}
                </AvatarFallback>
              </Avatar>
              {chat.ownerTiers && topVerificationTier(chat.ownerTiers as VerificationTier[]) && (
                <span className="absolute -bottom-1 -right-1">
                  <VerifiedBadge
                    tier={topVerificationTier(chat.ownerTiers as VerificationTier[])!}
                    iconOnly
                    size="xs"
                    verifiedAt={chat.ownerVerifiedAt}
                  />
                </span>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <button
                    type="button"
                    onClick={() => chat.ownerUserId && setProfileUserId(chat.ownerUserId)}
                    className="text-sm font-semibold truncate hover:text-[#16A34A] hover:underline cursor-pointer"
                    title="View full profile"
                  >
                    {chat.ownerName}
                  </button>
              <p className="text-[10px] text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageCircle className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Say hi to your team!</p>
              </div>
            ) : (
              messages.map(m => {
                const isMe = m.senderId === me?.id;
                const sender = members.find(x => x.userId === m.senderId);
                const senderName = isMe ? 'You' : (m.senderName || sender?.name || (m.senderRole === 'client' ? 'Call Center' : 'Agent'));
                const senderAvatar = isMe ? (me?.avatar || null) : (m.senderAvatar || sender?.avatar || null);
                const senderTiers = isMe ? (me?.verificationTiers || []) : (m.senderTiers || sender?.verificationTiers || []);
                const senderVerifiedAt = isMe ? (me?.verifiedAt || null) : (m.senderVerifiedAt || sender?.verifiedAt || null);
                return (
                  <MessageBubble
                    key={m.id}
                    m={m}
                    isMe={isMe}
                    senderName={senderName}
                    senderAvatar={senderAvatar}
                    senderTiers={senderTiers}
                    senderVerifiedAt={senderVerifiedAt}
            onShowProfile={setProfileUserId}
            senderId={m.senderId}
          />
                );
              })
            )}
          </div>
          <div className="border-t p-3 flex gap-2">
            <Input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              disabled={sending}
            />
            <Button onClick={handleSend} disabled={sending || !draft.trim()} className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Members sidebar (read-only for agents) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />Members
            </h3>
            <div className="space-y-2">
              {/* Owner */}
              <div className="flex items-center gap-2 p-2 rounded-md bg-green-50">
                <button
                  type="button"
                  onClick={() => chat.ownerUserId && setProfileUserId(chat.ownerUserId)}
                  className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
                  title="View full profile"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                    {chat.ownerAvatar && <AvatarImage src={chat.ownerAvatar} alt={chat.ownerName} />}
                    <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-xs font-semibold">
                      {getInitials(chat.ownerName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate flex items-center gap-1">
                    {chat.ownerName}
                    <Crown className="h-3 w-3 text-amber-500" />
                  </p>
                  <p className="text-[10px] text-gray-500">Owner</p>
                </div>
              </div>
              {members.filter(m => !m.isOwner).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">You&apos;re the only member</p>
              ) : (
                members.filter(m => !m.isOwner).map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50">
                    <MemberAvatar member={m}
              onShowProfile={setProfileUserId}
            />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {m.userId === me?.id ? <span className="text-[#16A34A]">{m.name} (you)</span> : m.name}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">{m.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Add Agent dialog (client only) — scoped to a specific groupChatId
// ──────────────────────────────────────────────────────────────
function AddAgentDialog({
  open, onOpenChange, onAdded, groupChatId,
}: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: () => void; groupChatId: string }) {
  const { addToast } = useAppStore();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const search = async () => {
    setSearching(true);
    try {
      const r = await authFetch('/api/messages/search-users?q=' + encodeURIComponent(q));
      if (!r.ok) throw new Error('Failed');
      const d = await r.json();
      // Only show agents
      setResults((d.users || []).filter((u: SearchUser) => u.role === 'agent'));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (open) {
      setQ('');
      setResults([]);
      search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAdd = async (userId: string, name: string) => {
    setAdding(userId);
    try {
      const r = await authFetch('/api/group-chat/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, groupChatId }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed');
      }
      const d = await r.json();
      addToast({
        title: d.alreadyMember ? name + ' is already in the chat' : name + ' added to the chat',
        variant: 'success',
      });
      onAdded();
      onOpenChange(false);
    } catch (e: any) {
      addToast({ title: e?.message || 'Failed to add', variant: 'destructive' });
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an agent to this team chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') search(); }}
              placeholder="Search agents by name or email..."
            />
            <Button variant="outline" onClick={search} disabled={searching}>
              <Search className="h-4 w-4 mr-1.5" />Search
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {results.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                {searching ? 'Searching...' : 'No agents found'}
              </p>
            ) : (
              results.map(u => (
                <div key={u.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50">
                  <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                    {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                    <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-xs font-semibold">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                    disabled={adding === u.id}
                    onClick={() => handleAdd(u.id, u.name)}
                  >
                    {adding === u.id ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
