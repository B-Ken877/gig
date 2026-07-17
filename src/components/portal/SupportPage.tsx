'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAppStore, authFetch } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Headphones, Plus, MessageCircle, Clock, CheckCircle2, XCircle, Send, ChevronRight } from 'lucide-react';
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

export default function SupportPage() {
  const { currentUser, addToast, navigateTo } = useAppStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = useCallback(() => {
    if (!currentUser) return;
    authFetch('/api/support-tickets')
      .then(r => r.json())
      .then(data => { if (data.tickets) setTickets(data.tickets); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

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
    } catch { addToast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const handleOpenChat = (ticket: Ticket) => {
    if (ticket.conversationId) {
      navigateTo('messages' as never);
    } else {
      useAppStore.getState().pendingChatUserId = 'cmrjo435c0001kqp7e69n63f5';
      navigateTo('messages' as never);
    }
  };

  const openCount = tickets.filter(t => t.status === 'open').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

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
              <p className="text-xs text-gray-400 mt-1">Click "New Ticket" to get help from our support team.</p>
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
                    {ticket.status === 'open' && (
                      <Button size="sm" onClick={() => handleOpenChat(ticket)} className="shrink-0 h-8 text-xs bg-green-600 text-white hover:bg-green-700 gap-1">
                        <MessageCircle className="h-3 w-3" />Chat <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
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
