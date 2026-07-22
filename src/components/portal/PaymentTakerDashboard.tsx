'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { DollarSign, AlertCircle, RefreshCw, Inbox, CheckCircle2, XCircle, Clock, MessageCircle, User as UserIcon, Mail, CreditCard, Calendar, BadgeCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore, authFetch } from '@/lib/store';
import type { PaymentRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  VerifiedBadge,
  VerifiedBadgeStyles,
  topVerificationTier,
  type VerificationTier,
} from '@/components/ui/verified-badge';
import { UserProfileModal } from '@/components/ui/user-profile-modal';

export default function PaymentTakerDashboard() {
  const { currentUser, navigateTo } = useAppStore();

  // Payment state
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selected, setSelected] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const loadPayments = useCallback(() => {
    if (!currentUser) return;
    authFetch('/api/payment-requests?status=pending')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => {
        if (isMountedRef.current) {
          setRequests(data.paymentRequests || data.requests || []);
          if (firstLoad) setFirstLoad(false);
        }
      })
      .catch(err => { if (isMountedRef.current && firstLoad) { setError(err.message); setFirstLoad(false); } })
      .finally(() => { if (isMountedRef.current) setLoading(false); });
  }, [currentUser, firstLoad]);

  useEffect(() => {
    isMountedRef.current = true;
    loadPayments();
    // Poll for new pending requests every 15s
    const interval = setInterval(loadPayments, 15000);
    return () => { isMountedRef.current = false; clearInterval(interval); };
  }, [loadPayments]);

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

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try {
      const r = await authFetch('/api/payment-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' }),
      });
      if (r.ok) {
        loadPayments();
        setSelected(null);
      }
    } catch {}
    setActionLoading(null);
  };
  const handleReject = async (id: string) => {
    setActionLoading(id + '-reject');
    try {
      const r = await authFetch('/api/payment-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected' }),
      });
      if (r.ok) {
        loadPayments();
        setSelected(null);
      }
    } catch {}
    setActionLoading(null);
  };

  // Open the chat with this user in the Messages tab. We stash the user
  // id in pendingChatUserId so MessagesPage auto-selects that conversation.
  const openChatWithUser = (userId: string) => {
    // Use the navigation store to remember which chat to open
    (useAppStore.getState() as any).pendingChatUserId = userId;
    navigateTo('messages');
  };

  return (
    <div className="space-y-6">
      <VerifiedBadgeStyles />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Requests</h2>
          <p className="text-sm text-gray-500">Review and approve pending subscription payments</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-semibold text-xs">{requests.length} pending</span>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="flex h-[calc(75vh-8rem)] min-h-[480px] flex-col lg:flex-row">
          {/* LEFT: List of pending requests */}
          <div className="flex w-full flex-col border-r border-gray-100 lg:w-[380px]">
            <div className="p-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Requests ({requests.length})</div>
            <div className="flex-1 overflow-y-auto">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400"><Inbox className="h-10 w-10 mb-2 opacity-30" /><p className="text-sm">No pending requests</p></div>
              ) : requests.map(req => {
                const reqUser = req.user as any;
                const reqTiers: VerificationTier[] = (reqUser?.verificationTiers || []) as VerificationTier[];
                const reqTopTier = topVerificationTier(reqTiers);
                const reqInitials = (reqUser?.name || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                <div key={req.id} onClick={() => setSelected(req)} className={cn('flex items-center justify-between gap-3 p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors', selected?.id === req.id && 'bg-green-50/50')}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setProfileUserId(req.userId); }}
                      className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
                      title="View full profile"
                    >
                      <Avatar className="h-9 w-9">
                        {reqUser?.avatar && <AvatarImage src={reqUser.avatar} alt={reqUser?.name || 'User'} />}
                        <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-[10px] font-bold">{reqInitials}</AvatarFallback>
                      </Avatar>
                      {reqTopTier && (
                        <span className="absolute -bottom-1 -right-1">
                          <VerifiedBadge tier={reqTopTier} iconOnly size="xs" verifiedAt={reqUser?.verifiedAt} />
                        </span>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setProfileUserId(req.userId); }}
                        className="text-sm font-medium text-gray-900 hover:text-[#16A34A] hover:underline cursor-pointer truncate block w-full text-left"
                        title="View full profile"
                      >
                        {reqUser?.name || 'Unknown'}
                      </button>
                      <p className="text-xs text-gray-500">{req.feeType} - {req.amount} {req.currency}</p>
                      <p className="text-xs text-gray-400 mt-0.5"><Clock className="h-3 w-3 inline mr-1" />{new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 text-[10px] capitalize shrink-0">{reqUser?.role || 'user'}</Badge>
                </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Payment request details (NOT a chat panel) */}
          <div className="flex flex-1 flex-col bg-gray-50">
            {!selected ? (
              <div className="flex h-full items-center justify-center text-gray-400 flex-col">
                <DollarSign className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Select a request to review details</p>
              </div>
            ) : (() => {
              const reqUser = selected.user as any;
              const reqTiers: VerificationTier[] = (reqUser?.verificationTiers || []) as VerificationTier[];
              const reqTopTier = topVerificationTier(reqTiers);
              const reqInitials = (reqUser?.name || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
              const isApproving = actionLoading === selected.id + '-approve';
              const isRejecting = actionLoading === selected.id + '-reject';
              const roleLabel = (reqUser?.role || 'user') === 'agent' ? 'Agent' : (reqUser?.role === 'client' ? 'Call Center' : reqUser?.role);
              return (
                <>
                  {/* Header with user info */}
                  <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setProfileUserId(selected.userId)}
                      className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
                      title="View full profile"
                    >
                      <Avatar className="h-12 w-12">
                        {reqUser?.avatar && <AvatarImage src={reqUser.avatar} alt={reqUser?.name || 'User'} />}
                        <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-sm font-bold">{reqInitials}</AvatarFallback>
                      </Avatar>
                      {reqTopTier && (
                        <span className="absolute -bottom-1 -right-1">
                          <VerifiedBadge tier={reqTopTier} iconOnly size="xs" verifiedAt={reqUser?.verifiedAt} />
                        </span>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setProfileUserId(selected.userId)}
                        className="text-sm font-semibold truncate hover:text-[#16A34A] hover:underline cursor-pointer block w-full text-left"
                        title="View full profile"
                      >
                        {reqUser?.name || 'Unknown'}
                      </button>
                      <p className="text-xs text-gray-500 truncate">{reqUser?.email}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 text-[10px] capitalize shrink-0">{roleLabel}</Badge>
                  </div>

                  {/* Details panel */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Subscription tier card */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="h-4 w-4 text-[#16A34A]" />
                        <h3 className="text-sm font-semibold text-gray-900">Subscription Requested</h3>
                      </div>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Tier</dt>
                          <dd className="font-medium text-gray-900 capitalize">{(selected.feeType || '').replace('_', ' ')}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Amount</dt>
                          <dd className="font-medium text-gray-900">{selected.amount} {selected.currency}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Requested on</dt>
                          <dd className="font-medium text-gray-900">{new Date(selected.createdAt).toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Status</dt>
                          <dd className="font-medium text-amber-700 capitalize">{selected.status}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* User info card */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <UserIcon className="h-4 w-4 text-[#16A34A]" />
                        <h3 className="text-sm font-semibold text-gray-900">User Information</h3>
                      </div>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray-500 flex items-center gap-1.5 shrink-0"><Mail className="h-3.5 w-3.5" />Email</dt>
                          <dd className="font-medium text-gray-900 truncate text-right">{reqUser?.email || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray-500 flex items-center gap-1.5 shrink-0"><Calendar className="h-3.5 w-3.5" />Joined</dt>
                          <dd className="font-medium text-gray-900">{reqUser?.createdAt ? new Date(reqUser.createdAt).toLocaleDateString() : '—'}</dd>
                        </div>
                        {reqTiers.length > 0 && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-gray-500 flex items-center gap-1.5 shrink-0"><BadgeCheck className="h-3.5 w-3.5" />Badges</dt>
                            <dd className="flex items-center flex-wrap gap-1 justify-end">
                              {reqTiers.sort((a, b) => {
                                const order: VerificationTier[] = ['elite', 'top_rated', 'trusted_partner', 'background_checked', 'verified'];
                                return order.indexOf(a) - order.indexOf(b);
                              }).map(t => <VerifiedBadge key={t} tier={t} size="xs" />)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                      <p className="font-medium mb-1">How to complete this payment</p>
                      <p className="text-xs text-blue-600 leading-relaxed">
                        Use the chat below to coordinate payment details with the user (e.g., share your mobile money number, confirm receipt).
                        Once you have received the payment, click <strong>Approve</strong> to instantly activate their subscription.
                        If the request is invalid or the user changes their mind, click <strong>Reject</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="border-t border-gray-200 bg-white p-3 flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 shrink-0"
                      disabled={isApproving || isRejecting}
                      onClick={() => handleApprove(selected.id)}
                      title="Approve payment and activate user subscription"
                    >
                      {isApproving ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                      disabled={isApproving || isRejecting}
                      onClick={() => handleReject(selected.id)}
                      title="Reject payment request"
                    >
                      {isRejecting ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 shrink-0 ml-auto"
                      onClick={() => openChatWithUser(selected.userId)}
                      title="Open chat with this user in the Messages tab"
                    >
                      <MessageCircle className="h-4 w-4 mr-1.5" />
                      Open Chat
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </Card>
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}
