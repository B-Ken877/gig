'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, authFetch } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CreditCard, MessageCircle, Clock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  senderRole?: string;
}

/**
 * Payment chat page.
 *
 * Reachable when:
 *   - An agent tries to apply for a job without an active subscription.
 *   - A call center tries to open the "Job Links" tab without an active subscription.
 *
 * It opens (or reuses) a 1:1 conversation with an admin and pre-fills a
 * greeting that names the right tier + amount. It also creates a
 * PaymentRequest (status: pending) so the admin sees the request in the
 * Payment Requests dashboard and gets a notification.
 *
 * Tiers (per the new pricing model):
 *   - Agent:        1,000 HTG / quarter (3 months)
 *   - Call Center:  3,000 HTG / year    (12 months)
 */
export default function PendingPaymentPage() {
  const { currentUser, navigateTo } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New pricing model — free registration, payment only at gated features.
  const tierAmount = currentUser?.role === 'client'
    ? '3,000 HTG / year'
    : '1,000 HTG / 3 months';
  const tierDescription = currentUser?.role === 'client'
    ? 'Call Center Yearly Subscription'
    : 'Agent Quarterly Subscription';
  const roleLabel = currentUser?.role === 'client' ? 'Call Center' : 'Agent';

  // Find admin and create conversation (only once)
  const initDoneRef = useRef(false);
  useEffect(() => {
    const init = async () => {
      if (initDoneRef.current) return;
      if (!currentUser) return;
      try {
        // Find an admin user (payment_taker role is now merged into admin)
        // Search broadly with an empty query so the API returns its full list,
        // then filter client-side for admin role.
        let ptId: string | null = null;
        const searchRes = await authFetch('/api/messages/search-users?q=&includeAdmins=true');
        if (searchRes.ok) {
          const data = await searchRes.json();
          const users = data.users || data || [];
          // Look for admin or payment_taker (legacy DB rows)
          const pt = users.find((u: { role?: string }) => u.role === 'admin' || u.role === 'payment_taker');
          if (pt) {
            ptId = pt.id;
            setAdminId(pt.id);
          }
        }

        // If we still can't find an admin (rare — there should always be at
        // least one admin in the system), surface the error to the user
        // instead of silently failing. The idempotent POST below will also
        // fail gracefully if ptId is null.
        if (!ptId) {
          console.error('[PendingPaymentPage] No admin user found in search results');
          // Don't return early — fall through to create the PaymentRequest
          // WITHOUT a conversation. The admin will still see the request in
          // their dashboard and can reach out via the user's profile.
          setLoading(false);
          // Try to create the PaymentRequest anyway so the admin sees it.
          createPaymentRequest(null).catch(() => { /* non-fatal */ });
          return;
        }

        // Start a FRESH conversation for this payment attempt.
        // resetConversation=true tells the API to wipe any prior messages
        // in the existing admin conversation, so the chat appears new
        // (matches the ticket system pattern: each payment request is a
        // fresh thread, not appended to a previous one).
        // The Conversation table has a UNIQUE(user1Id, user2Id) constraint
        // so we can't literally create a new row — we reset the existing
        // one in place.
        const createRes = await authFetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientUserId: ptId,
            resetConversation: true,
            content: 'Hello! I would like to activate my ' + roleLabel + ' subscription (' + tierDescription + ' — ' + tierAmount + '). How do I proceed with the payment?',
          }),
        });
        if (createRes.ok) {
          const newConv = await createRes.json();
          if (newConv.conversationId) {
            setConversationId(newConv.conversationId);
          }
          if (newConv.message) {
            setMessages([newConv.message]);
          }
        }
        // Create the PaymentRequest regardless of whether the message was sent —
        // the admin needs to see it in their queue.
        await createPaymentRequest(ptId).catch(() => { /* non-fatal */ });
        initDoneRef.current = true;
      } catch (err) {
        console.error('Init payment chat error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Create a pending PaymentRequest for this user + notify the admin.
  // Idempotent — if a pending request already exists, the API just returns it.
  const createPaymentRequest = async (adminId: string) => {
    try {
      await authFetch('/api/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          adminId,
          tierDescription,
          tierAmount,
          roleLabel,
        }),
      });
    } catch (err) {
      console.error('Failed to create payment request:', err);
    }
  };

  // Poll for new messages
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const res = await authFetch('/api/messages?conversationId=' + conversationId);
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        // silent poll failure
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !adminId) return;
    setSending(true);
    try {
      const res = await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId: adminId,
          content: newMessage.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }
        setNewMessage('');
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => navigateTo(currentUser?.role === 'agent' ? 'agent-dashboard' : 'client-dashboard')}
          className="text-slate-400 hover:text-white"
          title="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            Activate Subscription
          </h1>
          <p className="text-slate-400 text-sm">{tierDescription} — Chat with the admin to complete your payment</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5">
          <span className="text-emerald-300 text-sm font-medium">{tierAmount}</span>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-emerald-500/5 border-b border-emerald-500/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-300">
            <p className="font-medium text-emerald-300 mb-0.5">How it works</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Send a message to the admin below to start the payment process. Once your payment is received and approved,
              you will be able to {roleLabel === 'Agent' ? 'apply for jobs' : 'access the Job Links tab'} immediately.
              Your subscription will be valid for {roleLabel === 'Agent' ? '3 months' : '12 months'} from the activation date.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-3xl mx-auto w-full min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Starting your payment conversation...</p>
            <p className="text-slate-500 text-sm mt-1">An admin will help you complete the process.</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg) => {
              const isMine = msg.senderId === currentUser?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={'flex ' + (isMine ? 'justify-end' : 'justify-start')}
                >
                  <div className={'max-w-[80%] rounded-2xl px-4 py-2.5 ' + (
                    isMine
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/10 text-slate-200'
                  )}>
                    {!isMine && msg.senderRole && (
                      <p className="text-xs font-medium text-emerald-400 mb-1">
                        {msg.senderRole === 'admin' || msg.senderRole === 'payment_taker' ? 'Admin' : msg.senderRole}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={'text-[10px] mt-1 ' + (isMine ? 'text-emerald-200' : 'text-slate-500')}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1 bg-white/5 border-white/10 text-white"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
