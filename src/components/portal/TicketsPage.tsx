'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAppStore, authFetch } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, CheckCircle2, XCircle, Clock, Send, MessageCircle, User, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  conversationId: string | null;
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
  isRead: boolean;
  createdAt: string;
  sender?: { name: string; role: string };
}

export default function TicketsPage() {
  const { currentUser, addToast, navigateTo } = useAppStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [chatTicket, setChatTicket] = useState<Ticket | null>(null);
  const [chatMessages, setChatMessages] = useState<TicketMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);

  const supportAgentId = 'cmrjo435c0001kqp7e69n63f5';

  const fetchTickets = useCallback(() => {
    if (!currentUser) return;
    authFetch('/api/support-tickets')
      .then(r => r.json())
      .then(data => { if (data.tickets) setTickets(data.tickets); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const fetchChatMessages = async (ticket: Ticket) => {
    if (!ticket.conversationId) return;
    setChatLoading(true);
    try {
      const res = await authFetch('/api/conversations/' + ticket.conversationId + '/messages');
      const data = await res.json();
      if (data.messages) setChatMessages(data.messages);
    } catch {}
    setChatLoading(false);
  };

  const openChat = (ticket: Ticket) => {
    setChatTicket(ticket);
    setChatMessages([]);
    if (ticket.conversationId) {
      fetchChatMessages(ticket);
    } else {
      setChatMessages([]);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !chatTicket || !currentUser) return;
    const msg = chatInput.trim();
    setChatInput('');

    let convId = chatTicket.conversationId;

    try {
      if (!convId) {
        const res = await authFetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otherUserId: chatTicket.userId }),
        });
        const data = await res.json();
        convId = data.conversation?.id;
        if (convId) {
          await authFetch('/api/support-tickets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: chatTicket.id, conversationId: convId }),
          });
          setChatTicket({ ...chatTicket, conversationId: convId });
        }
      }

      if (convId) {
        await authFetch('/api/conversations/' + convId + '/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: msg }),
        });
        const newMsg: TicketMessage = {
          id: 'temp-' + Date.now(),
          senderId: currentUser.id,
          senderRole: currentUser.role,
          content: msg,
          isRead: false,
          createdAt: new Date().toISOString(),
          sender: { name: currentUser.name, role: currentUser.role },
        };
        setChatMessages(prev => [...prev, newMsg]);
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
  };

  const closeTicket = async (ticketId: string) => {
    setClosing(ticketId);
    try {
      const res = await authFetch('/api/support-tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, status: 'closed' }),
      });
      if (res.ok) {
        addToast({ title: 'Ticket Closed', description: 'Ticket has been resolved.', variant: 'success' });
        fetchTickets();
        if (chatTicket && chatTicket.id === ticketId) {
          setChatTicket(prev => prev ? { ...prev, status: 'closed' } : null);
        }
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to close ticket', variant: 'destructive' });
    }
    setClosing(null);
  };

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);
  const openCount = tickets.filter(t => t.status === 'open').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

  // Chat panel view
  if (chatTicket) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setChatTicket(null); setChatMessages([]); }}>
            &larr; Back to Tickets
          </Button>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{chatTicket.subject}</h3>
            <p className="text-xs text-gray-500">from {chatTicket.user?.name || 'User'} ({chatTicket.user?.role || ''})</p>
          </div>
          {chatTicket.status === 'open' && (
            <Button size="sm" variant="outline" className="ml-auto text-red-600 border-red-200 hover:bg-red-50" onClick={() => closeTicket(chatTicket.id)} disabled={closing === chatTicket.id}>
              {closing === chatTicket.id ? 'Closing...' : 'Close Ticket'}
            </Button>
          )}
        </div>
        <Card className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && !chatLoading && (
                <div className="text-center py-8 text-sm text-gray-400">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No messages yet. Start the conversation.</p>
                </div>
              )}
              {chatMessages.map(m => {
                const isMe = m.senderId === currentUser?.id;
                return (
                  <div key={m.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-sm', isMe ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-800')}>
                      {!isMe && <p className="text-[10px] font-semibold text-gray-500 mb-0.5">{m.sender?.name || 'User'}</p>}
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={cn('text-[10px] mt-1', isMe ? 'text-green-100' : 'text-gray-400')}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })}
              {chatLoading && <div className="text-center text-xs text-gray-400">Loading messages...</div>}
            </div>
            <div className="border-t p-3 flex gap-2">
              <Textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }}} placeholder="Type your reply..." rows={1} className="flex-1 resize-none border-gray-200 text-sm min-h-0" />
              <Button onClick={sendChatMessage} disabled={!chatInput.trim()} className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 shrink-0 h-10 w-10 p-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ticket list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage and respond to support requests from agents and clients.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className={cn('cursor-pointer text-xs px-3 py-1', filter === 'all' && 'bg-green-600 text-white')}>All ({tickets.length})</Badge>
          <Badge variant="outline" className={cn('cursor-pointer text-xs px-3 py-1', filter === 'open' && 'bg-green-100 text-green-700 border-green-300')} onClick={() => setFilter('open')}>{openCount} Open</Badge>
          <Badge variant="outline" className={cn('cursor-pointer text-xs px-3 py-1', filter === 'closed' && 'bg-gray-200 text-gray-700')} onClick={() => setFilter('closed')}>{closedCount} Closed</Badge>
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
