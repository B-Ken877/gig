'use client';
import { useState, useEffect } from 'react';
import {
  Users, Search, RefreshCw, AlertCircle, Mail, Phone, Calendar,
  CheckCircle2, XCircle, MoreHorizontal, ShieldCheck, Clock, XCircle as XIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';

interface AdminUserRow {
  id: string; email: string; name: string; role: string;
  phone?: string; avatar?: string; isActive: boolean;
  accountStatus: string; createdAt: string;
  // Agent-specific (fetched separately)
  agentId?: string;
  idVerificationStatus?: string;
  idVerificationType?: string;
}

const ROLE_COLORS: Record<string, string> = {
  agent: 'bg-blue-100 text-blue-800',
  admin: 'bg-red-100 text-red-800',
};

const VERIF_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  unverified: { label: 'Not Verified', color: 'text-gray-700', bg: 'bg-gray-100', icon: XIcon },
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  verified: { label: 'Verified', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

export default function AdminUsers() {
  const { currentUser, addToast } = useAppStore();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewUser, setReviewUser] = useState<AdminUserRow | null>(null);
  const [reviewData, setReviewData] = useState<{ front: string; back: string; selfie: string; type: string } | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const headers = currentUser
    ? { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role }
    : {};

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users', { headers });
      const data = await res.json();
      const agentsOnly = (data.users || []).filter((u: AdminUserRow) => u.role !== 'admin' && u.role !== 'payment_taker');
      // Fetch agent details (verification status) for each agent
      const agentsWithDetails = await Promise.all(
        agentsOnly.map(async (u: AdminUserRow) => {
          try {
            const agentRes = await fetch(`/api/agents?userId=${u.id}`, { headers });
            const agentData = await agentRes.json();
            const agent = agentData.id ? agentData : (agentData.agents || [])[0];
            if (agent) {
              return {
                ...u,
                agentId: agent.id,
                idVerificationStatus: agent.idVerificationStatus || 'unverified',
                idVerificationType: agent.idVerificationType,
              };
            }
            return u;
          } catch {
            return u;
          }
        })
      );
      setUsers(agentsWithDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = users.filter(u => {
    if (search) {
      const q = search.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const updateStatus = async (user: AdminUserRow, isActive: boolean, accountStatus: string) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive, accountStatus }),
      });
      if (res.ok) { addToast({ title: 'User updated', variant: 'success' }); load(); }
    } catch { addToast({ title: 'Network error', variant: 'destructive' }); }
  };

  const openReview = async (user: AdminUserRow) => {
    setReviewUser(user);
    setReviewData(null);
    setRejectNotes('');
    try {
      // Fetch the agent's full record including photo URLs
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
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/agents/verify-id/${reviewUser.agentId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes: rejectNotes || 'Please retake your photos with better lighting.' }),
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="text-sm text-gray-500">{users.length} agent{users.length !== 1 ? 's' : ''} on the platform</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-10" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(u => {
                const vc = VERIF_CONFIG[u.idVerificationStatus || 'unverified'] || VERIF_CONFIG.unverified;
                const VIcon = vc.icon;
                return (
                  <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                    <Avatar className="h-10 w-10">
                      {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                      <AvatarFallback className="bg-[#16A34A] text-white text-xs font-bold">
                        {u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                        <Badge variant="secondary" className={`text-[10px] uppercase ${ROLE_COLORS[u.role] || 'bg-gray-100'}`}>{u.role}</Badge>
                        <Badge variant="secondary" className={`text-[10px] uppercase ${vc.bg} ${vc.color}`}>
                          <VIcon className="h-3 w-3 mr-0.5" /> {vc.label}
                        </Badge>
                        {!u.isActive && <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">Inactive</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</span>
                        {u.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{u.phone}</span>}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.idVerificationStatus === 'pending' && (
                        <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => openReview(u)}>
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Review ID
                        </Button>
                      )}
                      {(u.idVerificationStatus === 'verified' || u.idVerificationStatus === 'rejected') && (
                        <Button size="sm" variant="outline" onClick={() => openReview(u)}>
                          View ID
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.isActive ? (
                            <DropdownMenuItem onClick={() => updateStatus(u, false, 'suspended')} className="text-red-600">
                              <XCircle className="h-4 w-4 mr-2" /> Suspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => updateStatus(u, true, 'active')}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
                <Badge variant="secondary" className={`text-xs uppercase ${VERIF_CONFIG[reviewUser.idVerificationStatus || 'unverified'].bg} ${VERIF_CONFIG[reviewUser.idVerificationStatus || 'unverified'].color}`}>
                  {VERIF_CONFIG[reviewUser.idVerificationStatus || 'unverified'].label}
                </Badge>
                <span className="text-xs text-gray-500">Document type: {reviewData?.type === 'drivers_license' ? "Driver's License" : 'ID Card'}</span>
              </div>

              {reviewData ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Front of ID</p>
                    {reviewData.front ? (
                      <img src={reviewData.front} alt="ID Front" className="w-full rounded-lg border" />
                    ) : <p className="text-xs text-gray-400">No photo</p>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Back of ID</p>
                    {reviewData.back ? (
                      <img src={reviewData.back} alt="ID Back" className="w-full rounded-lg border" />
                    ) : <p className="text-xs text-gray-400">No photo</p>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Selfie with ID</p>
                    {reviewData.selfie ? (
                      <img src={reviewData.selfie} alt="Selfie with ID" className="w-full rounded-lg border" />
                    ) : <p className="text-xs text-gray-400">No photo</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full" />
                </div>
              )}

              {reviewUser.idVerificationStatus === 'pending' && (
                <>
                  <div className="space-y-2">
                    <Label>Rejection notes (optional — shown to the agent if rejected)</Label>
                    <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={2} placeholder="e.g. The photo is blurry. Please retake with better lighting." />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={handleApprove} disabled={reviewLoading}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50" onClick={handleReject} disabled={reviewLoading}>
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
