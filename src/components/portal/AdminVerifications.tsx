'use client';
import { useState, useEffect } from 'react';
import {
  ShieldCheck, Clock, XCircle, CheckCircle2, AlertCircle, RefreshCw,
  Mail, Calendar, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';

interface VerificationUser {
  userId: string;
  agentId: string;
  name: string;
  email: string;
  avatar?: string;
  country?: string;
  status: string;
  type?: string;
  submittedAt?: string;
  reviewedAt?: string;
  notes?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  verified: { label: 'Verified', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  unverified: { label: 'Not Submitted', color: 'text-gray-700', bg: 'bg-gray-100', icon: AlertCircle },
};

export default function AdminVerifications() {
  const { currentUser, addToast } = useAppStore();
  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewUser, setReviewUser] = useState<VerificationUser | null>(null);
  const [reviewData, setReviewData] = useState<{ front: string; back: string; selfie: string; type: string } | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');

  const headers = currentUser
    ? { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role }
    : {};

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all agents with their verification status
      const res = await fetch('/api/agents', { headers });
      const data = await res.json();
      const agents = data.agents || (data.id ? [data] : []);
      const verificationUsers: VerificationUser[] = agents.map((a: any) => ({
        userId: a.userId,
        agentId: a.id,
        name: a.user?.name || 'Unknown',
        email: a.user?.email || '',
        avatar: a.user?.avatar,
        country: a.country,
        status: a.idVerificationStatus || 'unverified',
        type: a.idVerificationType,
        submittedAt: a.idVerificationSubmittedAt,
        reviewedAt: a.idVerificationReviewedAt,
        notes: a.idVerificationNotes,
      }));
      setUsers(verificationUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = users.filter(u => filter === 'all' ? true : u.status === filter);

  const openReview = async (user: VerificationUser) => {
    setReviewUser(user);
    setReviewData(null);
    setRejectNotes('');
    try {
      const res = await fetch(`/api/agents?id=${user.agentId}`, { headers });
      const data = await res.json();
      const agent = data.agent || data;
      if (agent) {
        setReviewData({
          front: agent.idFrontPhotoUrl || '',
          back: agent.idBackPhotoUrl || '',
          selfie: agent.idSelfiePhotoUrl || '',
          type: agent.idVerificationType || 'id_card',
        });
      }
    } catch (e) {
      addToast({ title: 'Failed to load verification photos', variant: 'destructive' });
    }
  };

  const handleApprove = async () => {
    if (!reviewUser?.agentId) return;
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/agents/verify-id/${reviewUser.agentId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verified' }),
      });
      if (res.ok) {
        addToast({ title: 'Identity verified!', description: `${reviewUser.name} has been notified.`, variant: 'success' });
        setReviewUser(null);
        load();
      }
    } catch { addToast({ title: 'Failed', variant: 'destructive' }); }
    finally { setReviewLoading(false); }
  };

  const handleReject = async () => {
    if (!reviewUser?.agentId) return;
    if (!rejectNotes.trim()) {
      addToast({ title: 'Reason required', description: 'Please explain why the verification is being rejected. The agent needs to know what to fix.', variant: 'destructive' });
      return;
    }
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/agents/verify-id/${reviewUser.agentId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes: rejectNotes.trim() }),
      });
      if (res.ok) {
        addToast({ title: 'Verification rejected', description: `${reviewUser.name} has been notified.`, variant: 'success' });
        setReviewUser(null);
        load();
      }
    } catch { addToast({ title: 'Failed', variant: 'destructive' }); }
    finally { setReviewLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  if (error) return (
    <Card className="border-red-200 bg-red-50/50"><CardContent className="p-8 text-center">
      <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
      <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
    </CardContent></Card>
  );

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">ID Verifications</h2>
        <p className="text-sm text-gray-500">{pendingCount} pending review · {users.length} total agents</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['pending', 'verified', 'rejected', 'all'] as const).map(f => {
          const count = f === 'all' ? users.length : users.filter(u => u.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f} ({count})
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{filter === 'pending' ? 'No pending verifications.' : 'No users found.'}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(u => {
                const sc = STATUS_CONFIG[u.status] || STATUS_CONFIG.unverified;
                const SIcon = sc.icon;
                return (
                  <div key={u.agentId} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                    <Avatar className="h-10 w-10">
                      {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                      <AvatarFallback className="bg-[#16A34A] text-white text-xs font-bold">
                        {u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                        <Badge variant="secondary" className={`text-[10px] uppercase ${sc.bg} ${sc.color}`}>
                          <SIcon className="h-3 w-3 mr-0.5" /> {sc.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</span>
                        {u.country && <span>{u.country}</span>}
                        {u.submittedAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(u.submittedAt).toLocaleDateString()}</span>}
                        {u.type && <span className="text-gray-400">· {u.type === 'drivers_license' ? "Driver's License" : 'ID Card'}</span>}
                      </div>
                    </div>
                    {u.status === 'pending' && (
                      <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => openReview(u)}>
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Review
                      </Button>
                    )}
                    {(u.status === 'verified' || u.status === 'rejected') && u.status !== 'unverified' && (
                      <Button size="sm" variant="outline" onClick={() => openReview(u)}>View</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review modal */}
      <Dialog open={!!reviewUser} onOpenChange={(o) => { if (!o) setReviewUser(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ID Verification — {reviewUser?.name}</DialogTitle>
          </DialogHeader>
          {reviewUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={`text-xs uppercase ${STATUS_CONFIG[reviewUser.status]?.bg || ''} ${STATUS_CONFIG[reviewUser.status]?.color || ''}`}>
                  {STATUS_CONFIG[reviewUser.status]?.label || reviewUser.status}
                </Badge>
                <span className="text-xs text-gray-500">Document: {reviewData?.type === 'drivers_license' ? "Driver's License" : 'ID Card'}</span>
              </div>

              {reviewData ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Front of ID</p>
                    {reviewData.front ? <img src={reviewData.front} alt="ID Front" className="w-full rounded-lg border" /> : <p className="text-xs text-gray-400">No photo</p>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Back of ID</p>
                    {reviewData.back ? <img src={reviewData.back} alt="ID Back" className="w-full rounded-lg border" /> : <p className="text-xs text-gray-400">No photo</p>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Selfie with ID</p>
                    {reviewData.selfie ? <img src={reviewData.selfie} alt="Selfie" className="w-full rounded-lg border" /> : <p className="text-xs text-gray-400">No photo</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                </div>
              )}

              {reviewUser.status === 'pending' && (
                <>
                  <div className="space-y-2">
                    <Label>Reason for rejection <span className="text-red-500">*</span> <span className="text-xs font-normal text-gray-400">(required — shown to the agent)</span></Label>
                    <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={3} placeholder="e.g. The front photo is blurry and the text is not readable. Please retake with better lighting." />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={handleApprove} disabled={reviewLoading}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50" onClick={handleReject} disabled={reviewLoading || !rejectNotes.trim()}>
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
