'use client';
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Clock, DollarSign, AlertCircle, RefreshCw, ArrowLeft, Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import type { PaymentRequest } from '@/lib/types';

export default function PaymentTakerDashboard() {
  const { currentUser, addToast } = useAppStore();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selected, setSelected] = useState<PaymentRequest | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{id:string;senderId:string;content:string}>>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!currentUser) return;
    fetch('/api/payment-requests?status=pending', { headers: { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role } })
      .then(r => { if (!r.ok) throw new Error('Failed to load payment requests'); return r.json(); })
      .then(d => { if (d.paymentRequests) setRequests(d.paymentRequests); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [currentUser]);

  // On mobile, when selected changes, show chat
  useEffect(() => {
    if (selected) setMobileShowChat(true);
    else setMobileShowChat(false);
  }, [selected]);

  const selectedConvRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selected || !currentUser) { setChatMessages([]); setConvId(null); selectedConvRef.current = null; return; }
    selectedConvRef.current = null;
    fetch('/api/messages?userId=' + currentUser.id, { headers: { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role } })
      .then(r => r.json()).then(d => {
        if (d.conversations) {
          const existing = d.conversations.find((c: {user1Id:string;user2Id:string}) => c.user1Id === selected.userId || c.user2Id === selected.userId);
          if (existing) {
            selectedConvRef.current = existing.id;
            setConvId(existing.id);
            loadMessages(existing.id);
            return;
          }
        }
        // No existing conversation - create one (only once per selection)
        if (!selectedConvRef.current) {
          fetch('/api/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role },
            body: JSON.stringify({ recipientUserId: selected.userId, content: `Hi ${selected.user?.name}, I'm here to help you with your onboarding payment.` }),
          }).then(r => r.json()).then(d => {
            if (d.conversationId) {
              selectedConvRef.current = d.conversationId;
              setConvId(d.conversationId);
              loadMessages(d.conversationId);
            }
          });
        }
      });
  }, [selected?.id]);

  function loadMessages(cid: string) {
    fetch(`/api/messages?conversationId=${cid}`, { headers: { 'X-User-Id': currentUser!.id, 'X-User-Role': currentUser!.role } })
      .then(r => r.json()).then(d => { if (d.messages) setChatMessages(d.messages); });
  }

  useEffect(() => {
    if (!convId) return;
    const interval = setInterval(() => loadMessages(convId), 3000);
    return () => clearInterval(interval);
  }, [convId]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const sendMessage = () => {
    if (!newMsg.trim() || !currentUser) return;
    fetch('/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role },
      body: JSON.stringify({ conversationId: convId, content: newMsg.trim() }),
    }).then(r => r.json()).then(d => {
      if (d.conversationId && !convId) setConvId(d.conversationId);
      else loadMessages(convId!);
      setNewMsg('');
    });
  };



  const handleBackToList = () => {
    setSelected(null);
    setMobileShowChat(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load payment requests</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={load} className="border-red-300 text-red-600 hover:bg-red-100">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (requests.length === 0 && !selected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Inbox className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">All caught up!</p>
        <p className="text-sm mt-1">No pending payment requests right now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-0 md:gap-6 h-[calc(100vh-7rem)]">
      {/* Left: requests list - hidden on mobile when chat is shown */}
      <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 shrink-0 border md:rounded-xl bg-white overflow-hidden md:h-full h-60 md:h-auto`}>
        <div className="p-4 border-b bg-gray-50 shrink-0">
          <h3 className="font-semibold text-sm">Pending Payments</h3>
          <p className="text-xs text-gray-500">{requests.length} waiting</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {requests.map(r => (
            <button key={r.id} onClick={() => setSelected(r)}
              className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${selected?.id === r.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{r.user?.name}</span>
                <Badge variant="secondary" className="text-xs shrink-0 ml-2">{r.role}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">{r.user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <DollarSign className="h-3 w-3 text-green-600 shrink-0" />
                <span className="text-sm font-semibold text-green-700">{r.amount} {r.currency}</span>
                <span className="text-xs text-gray-400">({r.feeType})</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: chat + actions */}
      <div className={`${!mobileShowChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col border md:rounded-xl bg-white overflow-hidden md:h-full h-[calc(100vh-15rem)] min-h-0`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center"><MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Select a payment request to chat with the user</p></div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-3 md:px-4 py-3 border-b flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* Back button on mobile */}
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8" onClick={handleBackToList}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{selected.user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{selected.role} · {selected.amount} {selected.currency} ({selected.feeType})</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">{selected.amount} {selected.currency} · {selected.feeType}</Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 min-h-0">
              {chatMessages.map(m => {
                const isMe = m.senderId === currentUser?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${isMe ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEnd} />
            </div>

            {/* Input */}
            <div className="px-3 md:px-4 py-3 border-t flex gap-2 shrink-0">
              <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..."
                onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }} className="flex-1" />
              <Button onClick={sendMessage} disabled={!newMsg.trim()} className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}