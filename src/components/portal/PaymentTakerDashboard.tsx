'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Clock, DollarSign, AlertCircle, RefreshCw, ArrowLeft, Inbox, Headphones, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppStore, authFetch } from '@/lib/store';
import type { PaymentRequest } from '@/lib/types';
import { cn } from '@/lib/utils';

const POLL_INTERVAL = 15000;

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; role: string };
}

export default function PaymentTakerDashboard() {
  const { currentUser, addToast, navigateTo } = useAppStore();
  const [activeTab, setActiveTab] = useState<'payments' | 'tickets'>('payments');

  // Payment state
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selected, setSelected] = useState<PaymentRequest | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{id:string;senderId:string;content:string}>>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const selectedConvRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // ── Payment Requests ──
  const loadPayments = useCallback(() => {
    if (!currentUser) return;
    authFetch('/api/payment-requests?status=pending')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => { if (isMountedRef.current) { setRequests(data.requests || []); if (firstLoad) setFirstLoad(false); } })
      .catch(err => { if (isMountedRef.current && firstLoad) { setError(err.message); setFirstLoad(false); } })
      .finally(() => { if (isMountedRef.current) setLoading(false); });
  }, [currentUser, firstLoad]);

  useEffect(() => {
    isMountedRef.current = true;
    if (activeTab === 'payments') loadPayments();
    return () => { isMountedRef.current = false; };
  }, [activeTab, loadPayments]);

  // ── Support Tickets ──
  const loadTickets = useCallback(() => {
    authFetch('/api/support-tickets?status=open')
      .then(r => r.json())
      .then(data => { if (data.tickets) setTickets(data.tickets); })
      .catch(() => {})
      .finally(() => setTicketsLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'tickets') { setTicketsLoading(true); loadTickets(); }
  }, [activeTab, loadTickets]);

  // ── Chat ──
  useEffect(() => {
    if (!selected || !currentUser) { setChatMessages([]); setConvId(null); selectedConvRef.current = null; return; }
    if (selectedConvRef.current === selected.id) return;
    selectedConvRef.current = selected.id;
    authFetch('/api/messages?userId=' + currentUser.id)
      .then(r => r.json())
      .then(data => {
        const conv = (data.conversations || []).find((c: any) => c.user1Id === selected.userId || c.user2Id === selected.userId);
        if (conv) {
          setConvId(conv.id);
          return authFetch('/api/messages?conversationId=' + conv.id).then(r => r.json()).then(md => { if (md.messages) setChatMessages(md.messages); });
        }
      })
      .catch(() => {});
  }, [selected, currentUser]);

  useEffect(() => {
    if (!convId) return;
    const interval = setInterval(() => {
      authFetch('/api/messages?conversationId=' + convId).then(r => r.json()).then(data => {
        if (data.messages && data.messages.length > chatMessages.length) setChatMessages(data.messages);
      }).catch(() => {});
    }, 3000);
    pollRef.current = interval;
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [convId, chatMessages.length]);

  const sendMessage = () => {
    if (!newMsg.trim() || !convId || !currentUser) return;
    authFetch('/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: convId, content: newMsg.trim() }),
    }).then(r => {
      if (r.ok) {
        setNewMsg('');
        authFetch('/api/messages?conversationId=' + convId).then(r2 => r2.json()).then(data => { if (data.messages) setChatMessages(data.messages); });
      }
    }).catch(() => {});
  };

  const closeTicket = async (ticketId: string) => {
    try {
      const res = await authFetch('/api/support-tickets', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, status: 'closed' }),
      });
      if (res.ok) {
        addToast({ title: 'Ticket Closed', description: 'The ticket has been marked as resolved.', variant: 'success' });
        loadTickets();
      }
    } catch {}
  };

  const openTicketChat = (ticket: SupportTicket) => {
    if (ticket.conversationId) {
      navigateTo('messages' as never);
    } else {
      useAppStore.getState().pendingChatUserId = ticket.user.id;
      navigateTo('messages' as never);
    }
  };

  // ── Render ──
  if (loading && activeTab === 'payments') {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50"><CardContent className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-red-700 mb-1">Failed to load</p>
        <p className="text-xs text-red-500 mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={loadPayments} className="border-red-300 text-red-600 hover:bg-red-100"><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Retry</Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Support Dashboard</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab('payments')} className={cn('px-4 py-2 text-sm font-medium rounded-md transition-colors', activeTab === 'payments' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
          <DollarSign className="h-4 w-4 inline mr-1.5" />Payment Requests
        </button>
        <button onClick={() => setActiveTab('tickets')} className={cn('px-4 py-2 text-sm font-medium rounded-md transition-colors relative', activeTab === 'tickets' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
          <Headphones className="h-4 w-4 inline mr-1.5" />Tickets
          {tickets.filter(t => t.status === 'open').length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold">{tickets.filter(t => t.status === 'open').length}</span>
          )}
        </button>
      </div>

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="flex h-[calc(75vh-8rem)] min-h-[480px] flex-col lg:flex-row">
            <div className={cn('flex w-full flex-col border-r border-gray-100 lg:w-[340px]', mobileShowChat ? 'hidden lg:flex' : 'flex')}>
              <div className="p-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Requests ({requests.length})</div>
              <div className="flex-1 overflow-y-auto">
                {requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400"><Inbox className="h-10 w-10 mb-2 opacity-30" /><p className="text-sm">No pending requests</p></div>
                ) : requests.map(req => (
                  <div key={req.id} onClick={() => { setSelected(req); setMobileShowChat(true); }} className={cn('flex items-center justify-between p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors', selected?.id === req.id && 'bg-green-50/50')}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{req.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{req.feeType} - {req.amount} {req.currency}</p>
                      <p className="text-xs text-gray-400 mt-0.5"><Clock className="h-3 w-3 inline mr-1" />{new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <DollarSign className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
            <div className={cn('flex flex-1 flex-col bg-gray-50', !mobileShowChat ? 'hidden lg:flex' : 'flex')}>
              {!selected ? (
                <div className="flex h-full items-center justify-center text-gray-400"><DollarSign className="h-10 w-10 mb-2 opacity-30" /><p className="text-sm">Select a request</p></div>
              ) : (
                <>
                  <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
                    <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => setMobileShowChat(false)}><ArrowLeft className="h-5 w-5" /></Button>
                    <div><p className="text-sm font-semibold">{selected.user?.name}</p><p className="text-xs text-gray-500">{selected.feeType} - {selected.amount} {selected.currency}</p></div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className={cn('max-w-[80%] rounded-xl px-3 py-2 text-sm', msg.senderId === currentUser?.id ? 'ml-auto bg-green-500 text-white' : 'bg-white border text-gray-800')}>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 bg-white p-3 flex gap-2">
                    <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." className="flex-1 text-sm" onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                    <Button size="icon" onClick={sendMessage} className="bg-green-500 hover:bg-green-600 shrink-0"><Send className="h-4 w-4" /></Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* TICKETS TAB */}
      {activeTab === 'tickets' && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Headphones className="h-5 w-5 text-green-600" />
              <h3 className="text-sm font-semibold">Open Tickets ({tickets.filter(t => t.status === 'open').length})</h3>
            </div>
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full" /></div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12"><Headphones className="h-10 w-10 mx-auto mb-3 text-gray-300" /><p className="text-sm text-gray-500">No open tickets.</p></div>
            ) : (
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="border rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-gray-900">{ticket.subject}</h4>
                          <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">Open</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">From: {ticket.user?.name} ({ticket.user?.role})</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ticket.description}</p>
                        <p className="text-xs text-gray-400 mt-1"><Clock className="h-3 w-3 inline mr-1" />{new Date(ticket.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button size="sm" onClick={() => openTicketChat(ticket)} className="h-7 text-xs bg-green-600 text-white hover:bg-green-700 gap-1"><MessageCircle className="h-3 w-3" />Chat</Button>
                        <Button size="sm" variant="outline" onClick={() => closeTicket(ticket.id)} className="h-7 text-xs text-gray-600 gap-1"><CheckCircle2 className="h-3 w-3" />Close</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
