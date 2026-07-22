'use client';
import { useState, useEffect } from 'react';
import { Users, AlertCircle, RefreshCw, Search, Shield, Ban, CheckCircle, XCircle, BadgeCheck, Star, Crown, ShieldCheck, Sparkles, CreditCard, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  VerifiedBadge,
  VerifiedBadgeStyles,
  VERIFICATION_TIERS,
  topVerificationTier,
  type VerificationTier,
} from '@/components/ui/verified-badge';
import { UserProfileModal } from '@/components/ui/user-profile-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
/* Dialog & inline-modal icons removed — using shared UserProfileModal */

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: string;
  isActive: boolean;
  avatar?: string | null;
  createdAt: string;
  companyName?: string | null;
  verificationTiers?: VerificationTier[];
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  gigScore?: number;
  // Subscription
  paid?: boolean;
  paidUntil?: string | null;
  paymentTier?: string | null;
}

const TIER_DESCRIPTIONS: Record<VerificationTier, string> = {
  verified: 'Identity-verified user — sapphire badge',
  top_rated: 'Top-rated performer — gold badge',
  trusted_partner: 'Vetted call center / partner — emerald badge',
  background_checked: 'Background-check cleared — ruby badge',
  elite: 'Admin-granted elite tier — onyx + gold badge',
};

export default function AdminUsers() {
  const { currentUser, addToast } = useAppStore();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  // Open the shared full-profile modal for a user.
  // The modal fetches the user record itself via /api/users/[id].
  const openUserProfile = (userId: string) => {
    setProfileUserId(userId);
  };

  const loadUsers = () => {
    if (!currentUser) return;
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    if (filter) params.set('role', filter);
    fetch('/api/users?' + params, { headers: { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin' } })
      .then(r => { if (!r.ok) throw new Error('Failed to load users'); return r.json(); })
      .then(d => { if (d.users) setUsers(d.users); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadUsers(); }, [currentUser, filter]);

  const handleAction = async (userId: string, action: 'approve' | 'reject' | 'suspend') => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/users/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser!.id, 'X-User-Role': 'admin' },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        const labels = { approve: 'approved', reject: 'rejected', suspend: 'suspended' };
        addToast({ title: 'User ' + labels[action], variant: action === 'approve' ? 'success' : 'destructive' });
        loadUsers();
      } else { addToast({ title: 'Action failed', variant: 'destructive' }); }
    } catch { addToast({ title: 'Network error', variant: 'destructive' }); }
    setActionLoading(null);
  };

  const handleVerify = async (userId: string, action: 'grant' | 'revoke', tier: VerificationTier) => {
    setActionLoading(userId + '-' + tier);
    try {
      const res = await fetch('/api/users/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser!.id, 'X-User-Role': 'admin' },
        body: JSON.stringify({ userId, action, tier }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update the user in the local list without a full reload
        setUsers(prev => prev.map(u => u.id === userId ? {
          ...u,
          verificationTiers: data.user?.verificationTiers || [],
          verifiedAt: data.user?.verifiedAt || null,
        } : u));
        addToast({
          title: action === 'grant' ? `Badge granted: ${tier.replace('_', ' ')}` : `Badge revoked: ${tier.replace('_', ' ')}`,
          variant: action === 'grant' ? 'success' : 'default',
        });
      } else {
        const err = await res.json().catch(() => ({}));
        addToast({ title: 'Verify failed', description: err.error || 'Try again', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  // ─── Toggle paid subscription ────────────────────────────────────────
  // Sets paid=true (with paidUntil = +3 months for agents, +12 months for
  // call centers) or paid=false (revokes access). Used after the admin
  // receives payment in the payment chat.
  const handleTogglePaid = async (userId: string, paid: boolean, role: string) => {
    setActionLoading(userId + '-paid');
    try {
      const res = await fetch('/api/users/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser!.id, 'X-User-Role': 'admin' },
        body: JSON.stringify({ userId, paid }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? {
          ...u,
          paid: data.user?.paid,
          paidUntil: data.user?.paidUntil,
          paymentTier: data.user?.paymentTier,
        } : u));
        const roleLabel = role === 'agent' ? 'Agent' : 'Call Center';
        if (paid) {
          const until = data.paidUntil ? new Date(data.paidUntil).toLocaleDateString() : '';
          addToast({
            title: `${roleLabel} marked as paid`,
            description: `Subscription active until ${until} (${data.amount} ${data.currency}).`,
            variant: 'success',
          });
        } else {
          addToast({ title: 'Subscription revoked', variant: 'default' });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        addToast({ title: 'Failed', description: err.error || 'Try again', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const roleColors: Record<string, string> = { agent: 'bg-blue-100 text-blue-800', client: 'bg-purple-100 text-purple-800', admin: 'bg-red-100 text-red-800', recruiter: 'bg-gray-100 text-gray-800' };
  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-800', pending_approval: 'bg-amber-100 text-amber-800', rejected: 'bg-red-100 text-red-800', suspended: 'bg-gray-100 text-gray-800' };

  const getDisplayName = (u: AdminUserRow) => u.role === 'client' && u.companyName ? u.companyName : u.name;
  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const filtered = search ? users.filter(u => {
    const dn = getDisplayName(u).toLowerCase();
    return dn.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
  }) : users;

  const verifiedCount = users.filter(u => (u.verificationTiers || []).length > 0).length;

  return (
    <div className="space-y-6">
      <VerifiedBadgeStyles />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">User Management</h2>
          <p className="text-sm text-gray-500">Manage all users and grant verification badges</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <BadgeCheck className="h-3.5 w-3.5" />
            <span className="font-semibold">{verifiedCount}</span> verified
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            <Users className="h-3.5 w-3.5" />
            <span className="font-semibold">{users.length}</span> total
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {['', 'agent', 'client', 'admin'].map(r => (
            <Button key={r || 'all'} variant={filter === r ? 'default' : 'outline'} size="sm" onClick={() => setFilter(r)} className={filter === r ? 'bg-[#16A34A] text-white hover:bg-[#16A34A]/90' : ''}>{r || 'All'}</Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-[#16A34A] border-t-transparent rounded-full" /></div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50"><CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" /><p className="text-sm font-medium text-red-700 mb-1">Failed to load users</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadUsers} className="border-red-300 text-red-600 hover:bg-red-100"><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Subscription</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Badges</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(u => {
              const dn = getDisplayName(u);
              const tiers = u.verificationTiers || [];
              const topTier = topVerificationTier(tiers as VerificationTier[]);
              // Display: payment_taker is now treated as admin
              const displayRole = u.role === 'payment_taker' ? 'admin' : u.role;
              // Subscription status for agents and call centers
              const isBillable = u.role === 'agent' || u.role === 'client';
              const paidUntilDate = u.paidUntil ? new Date(u.paidUntil) : null;
              const isSubscriptionActive = isBillable && u.paid && paidUntilDate && paidUntilDate > new Date();
              const isExpired = isBillable && u.paid && paidUntilDate && paidUntilDate <= new Date();
              const paidLoading = actionLoading === u.id + '-paid';
              return (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => openUserProfile(u.id)}
                    className="flex items-center gap-2 text-left hover:bg-gray-100 -mx-1 px-1 py-0.5 rounded transition-colors w-full"
                    title="View full profile"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-7 w-7">
                        {u.avatar && <AvatarImage src={u.avatar} alt={dn} />}
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-[10px] font-bold">{getInitials(dn)}</AvatarFallback>
                      </Avatar>
                      {topTier && (
                        <span className="absolute -bottom-1 -right-1">
                          <VerifiedBadge tier={topTier} iconOnly size="xs" verifiedAt={u.verifiedAt} />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[#16A34A] hover:underline">{dn}</div>
                      {u.role === 'client' && u.companyName && u.name !== u.companyName && (
                        <div className="text-[10px] text-gray-400 truncate">Contact: {u.name}</div>
                      )}
                    </div>
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3"><span className={"px-2 py-1 rounded-full text-xs font-medium " + (roleColors[displayRole] || roleColors[u.role] || '')}>{displayRole.replace('_', ' ')}</span></td>
                <td className="px-4 py-3"><span className={"px-2 py-1 rounded-full text-xs font-medium " + (statusColors[u.accountStatus] || '')}>{u.accountStatus.replace('_', ' ')}</span></td>
                <td className="px-4 py-3">
                  {!isBillable ? (
                    <span className="text-[10px] text-gray-400">—</span>
                  ) : isSubscriptionActive ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 w-fit">
                        <CheckCircle className="h-2.5 w-2.5" /> Paid
                      </span>
                      <span className="text-[10px] text-gray-400">until {paidUntilDate!.toLocaleDateString()}</span>
                    </div>
                  ) : isExpired ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 w-fit">
                        <XCircle className="h-2.5 w-2.5" /> Expired
                      </span>
                      <span className="text-[10px] text-gray-400">on {paidUntilDate!.toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                      <Clock className="h-2.5 w-2.5" /> Unpaid
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {tiers.length > 0 ? (
                    <div className="flex items-center flex-wrap gap-1">
                      {tiers.sort((a, b) => {
                        const order: VerificationTier[] = ['elite', 'top_rated', 'trusted_partner', 'background_checked', 'verified'];
                        return order.indexOf(a) - order.indexOf(b);
                      }).map(t => (
                        <VerifiedBadge key={t} tier={t} size="xs" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {/* Mark Paid toggle — only for agents and call centers */}
                    {isBillable && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          'h-7 px-2 text-xs gap-1 shrink-0',
                          isSubscriptionActive
                            ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                        )}
                        disabled={paidLoading}
                        title={isSubscriptionActive ? 'Revoke subscription' : 'Mark as paid (1,000 HTG/3mo agent · 3,000 HTG/yr call center)'}
                        onClick={() => handleTogglePaid(u.id, !isSubscriptionActive, u.role)}
                      >
                        {paidLoading ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : isSubscriptionActive ? (
                          <><CreditCard className="h-3.5 w-3.5" /><span className="hidden md:inline">Revoke</span></>
                        ) : (
                          <><DollarSign className="h-3.5 w-3.5" /><span className="hidden md:inline">Mark Paid</span></>
                        )}
                      </Button>
                    )}

                    {/* Verification dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                          disabled={actionLoading?.startsWith(u.id)}
                          title="Manage verification badges"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Verify</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel className="text-xs text-gray-500">
                          Verification Badges
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {VERIFICATION_TIERS.map(tier => {
                          const granted = tiers.includes(tier);
                          const isLoading = actionLoading === `${u.id}-${tier}`;
                          return (
                            <DropdownMenuItem
                              key={tier}
                              className="flex items-center justify-between gap-2 py-2 cursor-pointer"
                              onClick={() => handleVerify(u.id, granted ? 'revoke' : 'grant', tier)}
                              disabled={isLoading}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <VerifiedBadge tier={tier} size="xs" showLabel={false} />
                                <div className="min-w-0">
                                  <div className="text-xs font-medium capitalize truncate">
                                    {tier.replace('_', ' ')}
                                  </div>
                                  <div className="text-[10px] text-gray-400 truncate">
                                    {TIER_DESCRIPTIONS[tier]}
                                  </div>
                                </div>
                              </div>
                              <span className={`shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${granted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                {isLoading ? '…' : granted ? '✓' : '+'}
                              </span>
                            </DropdownMenuItem>
                          );
                        })}
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-[10px] text-gray-400">
                          Granted badges appear instantly across the platform.
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {u.accountStatus === 'pending_approval' && (<>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50" title="Approve" disabled={actionLoading === u.id} onClick={() => handleAction(u.id, 'approve')}><CheckCircle className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50" title="Reject" disabled={actionLoading === u.id} onClick={() => handleAction(u.id, 'reject')}><XCircle className="h-4 w-4" /></Button>
                    </>)}
                    {u.accountStatus === 'active' && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600 hover:bg-amber-50" title="Suspend" disabled={actionLoading === u.id} onClick={() => handleAction(u.id, 'suspend')}><Ban className="h-4 w-4" /></Button>
                    )}
                    {(u.accountStatus === 'rejected' || u.accountStatus === 'suspended') && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50" title="Reactivate" disabled={actionLoading === u.id} onClick={() => handleAction(u.id, 'approve')}><Shield className="h-4 w-4" /></Button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (<tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400"><Users className="h-10 w-10 mx-auto mb-2 opacity-30" />No users found</td></tr>)}
          </tbody>
        </table></div></CardContent></Card>
      )}

      {/* Shared full-profile modal — opens when admin clicks a user's name */}
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}
