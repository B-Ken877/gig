'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, authFetch } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, CheckCircle2, XCircle, Clock, Send, MessageCircle, User, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; role: string };
}

interface TicketMessage {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

export default function TicketsPage() {
  const { currentUser, addToast } = useAppStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [chatTicket, setChatTicket] = useState<Ticket | null>(null);
  const [chatMessages, setChatMessages] = useState<TicketMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTickets = useCallback(() => {
    if (!currentUser) return;
    authFetch('/api/support-tickets')
      .then(r => r.json())
      .then(data => { if (data.tickets) setTickets(data.tickets); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Poll for new messages while chat is open
  useEffect(() => {
    if (!chatTicket || chatTicket.status === 'closed') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    const fetchMsgs = () => {
      authFetch('/api/support-tickets/' + chatTicket.id + '/messages')
        .then(r => r.json())
        .then(data => { if (data.messages) setChatMessages(data.messages); })
        .catch(() => {});
    };
    fetchMsgs();
    pollRef.current = setInterval(fetchMsgs, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [chatTicket]);

  const openChat = (ticket: Ticket) => {
    setChatTicket(ticket);
    setChatMessages([]);
    setChatInput('');
    setChatLoading(true);
    authFetch('/api/support-tickets/' + ticket.id + '/messages')
      .then(r => r.json())
      .then(data => { if (data.messages) setChatMessages(data.messages); else setChatMessages([]); })
      .catch(() => setChatMessages([]))
      .finally(() => setChatLoading(false));
  };

  const closeTicket = async (ticketId: string) => {
    setClosing(ticketId);
    try {
      const res = await authFetch('/api/support-tickets', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, status: 'closed' }),
      });
      if (res.ok) {
        addToast({ title: 'Ticket Closed', description: 'Ticket has been resolved.', variant: 'success' });
        fetchTickets();
        if (chatTicket && chatTicket.id === ticketId) setChatTicket(prev => prev ? { ...prev, status: 'closed' } : null);
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to close ticket', variant: 'destructive' });
    }
    setClosing(null);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !chatTicket || !currentUser) return;
    const msg = chatInput.trim();
    setChatInput('');
    setSendingMsg(true);
    try {
      const res = await authFetch('/api/support-tickets/' + chatTicket.id + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) setChatMessages(prev => [...prev, data.message]);
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
    setSendingMsg(false);
  };

  const goBack = () => {
    setChatTicket(null);
    setChatMessages([]);
    setChatInput('');
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    fetchTickets();
  };

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);
  const openCount = tickets.filter(t => t.status === 'open').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

  // ========== CHAT VIEW ==========
  if (chatTicket) {
    return (
      <div className="flex flex-col space-y-4" style={{ height: 'calc(100vh - 180px)' }}>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={goBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{chatTicket.subject}</h3>
            <p className="text-xs text-gray-500">from {chatTicket.user?.name || 'User'} ({chatTicket.user?.role?.replace('_', ' ') || ''})</p>
          </div>
          {chatTicket.status === 'open' && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => closeTicket(chatTicket.id)} disabled={closing === chatTicket.id}>
              {closing === chatTicket.id ? 'Closing...' : 'Close Ticket'}
            </Button>
          )}
        </div>
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-3">
                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm bg-blue-50 border border-blue-100 text-gray-700">
                    <p className="text-[10px] font-semibold mb-0.5 text-blue-600">Ticket Description</p>
                    <p className="whitespace-pre-wrap break-words">{chatTicket.description}</p>
                    <p className="text-[10px] mt-1 text-gray-400">
                      {new Date(chatTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {chatMessages.length === 0 && !chatLoading && (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs text-gray-400">No messages yet. Start the conversation.</p>
                  </div>
                )}
                {chatMessages.map(m => {
                  const isMe = m.senderId === currentUser?.id;
                  return (
                    <div key={m.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-sm', isMe ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-800')}>
                        {!isMe && <p className="text-[10px] font-semibold mb-0.5 text-gray-500">{chatTicket.user?.name || 'User'}</p>}
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <p className={cn('text-[10px] mt-1', isMe ? 'text-green-100' : 'text-gray-400')}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {chatLoading && <div className="text-center text-xs text-gray-400 py-4">Loading messages...</div>}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="border-t p-3 flex gap-2 shrink-0 bg-white">
              <Textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                placeholder="Type your reply..."
                rows={1}
                className="flex-1 resize-none border-gray-200 text-sm min-h-0"
                disabled={chatTicket.status === 'closed'}
              />
              <Button
                onClick={sendMessage}
                disabled={!chatInput.trim() || sendingMsg || chatTicket.status === 'closed'}
                className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 shrink-0 h-10 w-10 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== TICKET LIST VIEW ==========
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage and respond to support requests from agents and clients.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className={cn('cursor-pointer text-xs px-3 py-1 select-none', filter === 'all' && 'bg-green-600 text-white')} onClick={() => setFilter('all')}>All ({tickets.length})</Badge>
          <Badge variant="outline" className={cn('cursor-pointer text-xs px-3 py-1 select-none', filter === 'open' && 'bg-green-100 text-green-700 border-green-300')} onClick={() => setFilter('open')}>{openCount} Open</Badge>
          <Badge variant="outline" className={cn('cursor-pointer text-xs px-3 py-1 select-none', filter === 'closed' && 'bg-gray-200 text-gray-700')} onClick={() => setFilter('closed')}>{closedCount} Closed</Badge>
        </div>
      </div>
      {filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No tickets found.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => {
            const isExpanded = expandedTicket === ticket.id;
            return (
              <Card key={ticket.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-gray-900">{ticket.subject}</h4>
                        <Badge className={cn('text-[10px] px-1.5 py-0', ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                          {ticket.status === 'open' ? <><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Open</> : <><XCircle className="h-2.5 w-2.5 mr-0.5" />Closed</>}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{ticket.user?.name || 'Unknown'} &middot; {ticket.user?.role?.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <Clock className="h-3 w-3" />{new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ticket.status === 'open' && (
                        <>
                          <Button size="sm" onClick={() => openChat(ticket)} className="h-8 text-xs bg-green-600 text-white hover:bg-green-700 gap-1">
                            <MessageCircle className="h-3 w-3" />Chat
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => closeTicket(ticket.id)} disabled={closing === ticket.id}>
                            {closing === ticket.id ? '...' : 'Close'}
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
