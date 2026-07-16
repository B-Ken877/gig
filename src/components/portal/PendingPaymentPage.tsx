'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, authFetch } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CreditCard, MessageCircle, Clock, ArrowLeft, LogOut } from 'lucide-react';
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

export default function PendingPaymentPage() {
  const { currentUser, navigateTo, logout } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [paymentTakerId, setPaymentTakerId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const feeAmount = currentUser?.role === 'client'
    ? '3,000 HTG / month'
    : '2,000 HTG / year';
  const roleLabel = currentUser?.role === 'client' ? 'Call Center' : 'Agent';

  // Find payment taker and create conversation (only once)
  const initDoneRef = useRef(false);
  useEffect(() => {
    const init = async () => {
      if (initDoneRef.current) return;
      try {
        // Find a payment taker user
        let ptId: string | null = null;
        const searchRes = await authFetch('/api/messages/search-users?q=payment');
        if (searchRes.ok) {
          const data = await searchRes.json();
          const users = data.users || data || [];
          const pt = users.find((u: { role?: string }) => u.role === 'payment_taker');
          if (pt) {
            ptId = pt.id;
            setPaymentTakerId(pt.id);
          }
        }

        if (!ptId) { setLoading(false); return; }

        // Check for existing conversation with payment taker (using local ptId, not state)
        const msgRes = await authFetch('/api/messages?userId=' + (currentUser?.id || ''));
        if (msgRes.ok) {
          const data = await msgRes.json();
          const conversations = data.conversations || [];
          if (Array.isArray(conversations)) {
            const ptConv = conversations.find((c: { user1Id: string; user2Id: string }) => {
              return c.user1Id === ptId || c.user2Id === ptId;
            });
            if (ptConv) {
              setConversationId(ptConv.id);
              initDoneRef.current = true;
              // Load messages for this conversation
              const convRes = await authFetch('/api/messages?conversationId=' + ptConv.id);
              if (convRes.ok) {
                const convData = await convRes.json();
                if (convData.messages) setMessages(convData.messages);
              }
              return;
            }
          }
        }

        // No existing conversation found - create one with greeting (only once)
        const createRes = await authFetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientUserId: ptId,
            content: 'Hello! I just registered as a ' + roleLabel + ' and need to complete my payment of ' + feeAmount + '. How do I proceed?',
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
        initDoneRef.current = true;
      } catch (err) {
        console.error('Init payment chat error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) init();
  }, [currentUser]);

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
    if (!newMessage.trim() || !paymentTakerId) return;
    setSending(true);
    try {
      const res = await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId: paymentTakerId,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-4">
        <button onClick={() => { logout(); navigateTo('home'); }} className="text-slate-400 hover:text-white">
          <LogOut className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" />
            Payment Pending
          </h1>
          <p className="text-slate-400 text-sm">{roleLabel} Registration — Waiting for payment confirmation</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5">
          <span className="text-amber-300 text-sm font-medium">{feeAmount}</span>
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
            <p className="text-slate-500 text-sm mt-1">A payment representative will help you complete the process.</p>
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
                        {msg.senderRole === 'payment_taker' ? 'Payment Representative' : msg.senderRole}
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
