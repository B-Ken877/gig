'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, authFetch } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Headphones, Plus, MessageCircle, Clock, CheckCircle2, XCircle, Send, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const SUPPORT_AGENT_ID = 'cmrjo435c0001kqp7e69n63f5';

export default function SupportPage() {
  const { currentUser, addToast } = useAppStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Chat state
  const [chatTicket, setChatTicket] = useState<Ticket | null>(null);
  const [chatMessages, setChatMessages] = useState<TicketMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
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

  // Auto-scroll to bottom when new messages arrive
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

  const goBack = () => {
    setChatTicket(null);
    setChatMessages([]);
    setChatInput('');
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    fetchTickets();
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

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), description: description.trim() }),
      });
      if (res.ok) {
        setSubject('');
        setDescription('');
        setShowForm(false);
        addToast({ title: 'Ticket Created', description: 'The support agent will respond shortly.', variant: 'success' });
        fetchTickets();
      } else {
        const d = await res.json();
        addToast({ title: 'Error', description: d.error || 'Failed to create ticket', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
    finally { setSubmitting(false); }
  };

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
            <div className="flex items-center gap-2">
              <Badge className={cn('text-[10px] px-1.5 py-0', chatTicket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                {chatTicket.status === 'open' ? 'Open' : 'Closed'}
              </Badge>
              <span className="text-xs text-gray-400">Chatting with Support Agent</span>
            </div>
          </div>
        </div>

        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-3">
                {/* Show ticket description as first message */}
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
                    <Headphones className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs text-gray-400">No messages yet. Send a message to start chatting.</p>
                  </div>
                )}
                {chatMessages.map(m => {
                  const isMe = m.senderId === currentUser?.id;
                  return (
                    <div key={m.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-sm', isMe ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-800')}>
                        {!isMe && (
                          <p className="text-[10px] font-semibold mb-0.5" style={{ color: '#16A34A' }}>
                            Support Agent
                          </p>
                        )}
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
                placeholder="Type your message..."
                rows={1}
                className="flex-1 resize-none border-gray-200 text-sm min-h-[40px] h-10 focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
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
  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

  const openCount = tickets.filter(t => t.status === 'open').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Support</h2>
          <p className="text-sm text-gray-500 mt-0.5">Open a ticket or chat with our support agent for help.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{showForm ? 'Cancel' : 'New Ticket'}</span>
        </Button>
      </div>

      {showForm && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-semibold">Create a Support Ticket</h3>
            <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="border-gray-200" />
            <Textarea placeholder="Describe your issue in detail..." value={description} onChange={e => setDescription(e.target.value)} rows={4} className="border-gray-200 resize-none" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!subject.trim() || !description.trim() || submitting} className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 gap-2">
                <Send className="h-4 w-4" />{submitting ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Badge variant="secondary" className="text-xs px-3 py-1">{openCount} Open</Badge>
        <Badge variant="outline" className="text-xs px-3 py-1">{closedCount} Closed</Badge>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Headphones className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-semibold">Your Tickets</h3>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <Headphones className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No tickets yet.</p>
              <p className="text-xs text-gray-400 mt-1">Click &quot;New Ticket&quot; to get help from our support team.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => (
                <div key={ticket.id} className="border rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-gray-900">{ticket.subject}</h4>
                        <Badge className={cn('text-[10px] px-1.5 py-0', ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                          {ticket.status === 'open' ? <><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Open</> : <><XCircle className="h-2.5 w-2.5 mr-0.5" />Closed</>}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ticket.description}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                        <Clock className="h-3 w-3" />{new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openChat(ticket)} className="shrink-0 h-8 text-xs bg-green-600 text-white hover:bg-green-700 gap-1">
                      <MessageCircle className="h-3 w-3" />Chat
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
