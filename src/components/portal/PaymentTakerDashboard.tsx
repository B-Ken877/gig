'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Clock, DollarSign, AlertCircle, RefreshCw, ArrowLeft, Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore, authFetch } from '@/lib/store';
import type { PaymentRequest } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PaymentTakerDashboard() {
  const { currentUser } = useAppStore();

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

  const selectedConvRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

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
    loadPayments();
    return () => { isMountedRef.current = false; };
  }, [loadPayments]);

  // Chat
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

  if (loading) {
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
    </div>
  );
}
