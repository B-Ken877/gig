'use client';
import { useState, useEffect } from 'react';
import {
  AlertCircle, RefreshCw, KeyRound, Clock, CheckCircle2, XCircle,
  Mail, Briefcase, ShieldCheck, Copy, Check,
  UserCheck, UserX, Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/lib/store';

interface ResetRequest {
  id: string;
  email: string;
  status: string;  // 'pending' | 'link_generated' | 'dismissed'
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;  // admin user id (just the foreign key)
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    accountStatus: string;
    avatar?: string | null;
    joinedAt: string;
    idVerificationStatus: string | null;
    applicationCount: number;
    activePlacementCount: number;
  } | null;
  hasActiveToken: boolean;
  latestToken: {
    id: string;
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
  } | null;
}

type StatusFilter = 'pending' | 'link_generated' | 'dismissed' | 'all';

export default function AdminPasswordResets() {
  const { currentUser, addToast } = useAppStore();
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  // Generate-link state
  const [generatedLink, setGeneratedLink] = useState<{ url: string; userName: string; userEmail: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  // Dismiss confirmation
  const [dismissConfirm, setDismissConfirm] = useState<ResetRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const headers = currentUser
    ? { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin' }
    : {};

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/password-resets', { headers });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); /* eslint-disable-next-line */ }, []);

  const filtered = requests.filter(r => statusFilter === 'all' ? true : r.status === statusFilter);

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    linkGenerated: requests.filter(r => r.status === 'link_generated').length,
    dismissed: requests.filter(r => r.status === 'dismissed').length,
    total: requests.length,
  };

  const handleGenerate = async (req: ResetRequest) => {
    setGeneratingFor(req.id);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/password-resets/${req.id}/generate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedLink({
          url: data.url,
          userName: data.user.name,
          userEmail: data.user.email,
          expiresAt: data.expiresAt,
        });
        addToast({ title: 'Reset link generated', description: 'Copy the URL and email it to the agent.', variant: 'success' });
        loadRequests();
      } else {
        addToast({ title: 'Failed to generate', description: data.error || 'Please try again', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setGeneratingFor(null);
      setActionLoading(false);
    }
  };

  const handleDismissConfirmed = async () => {
    if (!dismissConfirm) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/password-resets/${dismissConfirm.id}/generate`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });
      if (res.ok) {
        addToast({ title: 'Request dismissed', variant: 'success' });
        setDismissConfirm(null);
        loadRequests();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Failed to dismiss', description: data.error || 'Please try again', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = generatedLink.url;
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
      document.body.removeChild(textarea);
    }
  };

  const formatTimeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
    const diffD = Math.floor(diffHr / 24);
    return `${diffD} day${diffD !== 1 ? 's' : ''} ago`;
  };

  const formatExpiry = (iso: string) => {
    const diffMs = new Date(iso).getTime() - Date.now();
    const diffMin = Math.max(0, Math.round(diffMs / 60000));
    if (diffMin < 60) return `${diffMin} min`;
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
    link_generated: { label: 'Link Sent', color: 'text-blue-700', bg: 'bg-blue-100', icon: CheckCircle2 },
    dismissed: { label: 'Dismissed', color: 'text-gray-700', bg: 'bg-gray-100', icon: XCircle },
  };

  const verificationConfig: Record<string, { label: string; color: string; bg: string }> = {
    verified: { label: 'Verified', color: 'text-green-700', bg: 'bg-green-100' },
    pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100' },
    rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
    unverified: { label: 'Unverified', color: 'text-gray-700', bg: 'bg-gray-100' },
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50"><CardContent className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <Button variant="outline" size="sm" onClick={loadRequests}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
      </CardContent></Card>
    );
  }

  const filterTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'pending', label: 'Pending', count: stats.pending },
    { value: 'link_generated', label: 'Links Sent', count: stats.linkGenerated },
    { value: 'dismissed', label: 'Dismissed', count: stats.dismissed },
    { value: 'all', label: 'All', count: stats.total },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Password Resets</h2>
        <p className="text-sm text-gray-500">When an agent forgets their password, they submit a request here. Review it, generate a secure reset link, then email it to them manually.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0"><Clock className="h-4 w-4 text-amber-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pending</p>
              <p className="text-xl font-bold leading-tight text-amber-600">{stats.pending}</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><CheckCircle2 className="h-4 w-4 text-blue-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Links Sent</p>
              <p className="text-xl font-bold leading-tight text-blue-600">{stats.linkGenerated}</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><XCircle className="h-4 w-4 text-gray-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Dismissed</p>
              <p className="text-xl font-bold leading-tight text-gray-600">{stats.dismissed}</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0"><KeyRound className="h-4 w-4 text-purple-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold leading-tight text-purple-600">{stats.total}</p>
            </div>
          </div>
        </CardContent></Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {filterTabs.map(t => (
          <button
            key={t.value}
            onClick={() => setStatusFilter(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              statusFilter === t.value
                ? 'border-[#16A34A] text-[#16A34A]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label} <span className="text-xs text-gray-400 ml-1">({t.count})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">
          <KeyRound className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No {statusFilter === 'all' ? '' : statusFilter.replace('_', ' ')} requests.</p>
          <p className="text-xs mt-1">
            {statusFilter === 'pending'
              ? 'When an agent clicks "Forgot password?" on the login page, their request will appear here.'
              : 'Try switching tabs to see other requests.'}
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const sc = statusConfig[req.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            const u = req.user;
            const vc = u && u.idVerificationStatus ? (verificationConfig[u.idVerificationStatus] || verificationConfig.unverified) : null;
            return (
              <Card key={req.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  {/* Top row: avatar + name + status + request time */}
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 shrink-0">
                      {u?.avatar && <AvatarImage src={u.avatar} alt={u?.name || 'User'} />}
                      <AvatarFallback className={u ? 'bg-[#16A34A] text-white' : 'bg-gray-300 text-gray-600'}>
                        {(u?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {u ? (
                          <h3 className="font-semibold text-gray-900">{u.name}</h3>
                        ) : (
                          <h3 className="font-semibold text-gray-500 italic">Unknown user</h3>
                        )}
                        <Badge variant="secondary" className={`text-[9px] uppercase tracking-wide ${sc.bg} ${sc.color}`}>
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />{sc.label}
                        </Badge>
                        {u && (
                          <Badge variant="outline" className={`text-[9px] uppercase tracking-wide ${u.role === 'admin' ? 'border-purple-300 text-purple-700' : u.role === 'agent' ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-700'}`}>
                            {u.role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500 flex-wrap">
                        <span className="inline-flex items-center gap-0.5"><Mail className="h-3 w-3" />{req.email}</span>
                        {u?.role === 'agent' && u.idVerificationStatus && vc && (
                          <Badge variant="secondary" className={`text-[9px] uppercase ${vc.bg} ${vc.color}`}>
                            <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />{vc.label}
                          </Badge>
                        )}
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />Requested {formatTimeAgo(req.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Account context (only if user found) */}
                  {u && (
                    <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Account details — verify this is the right person before sending the link</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500">Joined</p>
                          <p className="font-medium text-gray-900 mt-0.5">{new Date(u.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Account Status</p>
                          <p className={`font-medium mt-0.5 ${u.accountStatus === 'active' ? 'text-green-700' : 'text-amber-700'}`}>
                            {u.isActive ? <UserCheck className="h-3 w-3 inline mr-1" /> : <UserX className="h-3 w-3 inline mr-1" />}
                            {u.accountStatus}
                          </p>
                        </div>
                        {u.role === 'agent' && (
                          <>
                            <div>
                              <p className="text-gray-500">Applications</p>
                              <p className="font-medium text-gray-900 mt-0.5"><Briefcase className="h-3 w-3 inline mr-1" />{u.applicationCount}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Active Placements</p>
                              <p className="font-medium text-gray-900 mt-0.5"><CheckCircle2 className="h-3 w-3 inline mr-1" />{u.activePlacementCount}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Existing token info (if a link was already generated) */}
                  {req.status === 'link_generated' && req.latestToken && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-[10px] text-blue-700 uppercase tracking-wider font-medium mb-1 flex items-center gap-1">
                        <KeyRound className="h-3 w-3" />Reset link {req.latestToken.usedAt ? '(used)' : req.hasActiveToken ? '(active)' : '(expired)'}
                      </p>
                      <p className="text-xs text-blue-900">
                        Generated {formatTimeAgo(req.latestToken.createdAt)}
                        {req.latestToken.usedAt && <> · Used {formatTimeAgo(req.latestToken.usedAt)}</>}
                        {!req.latestToken.usedAt && <> · Expires in {formatExpiry(req.latestToken.expiresAt)}</>}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    {req.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 h-9 bg-[#16A34A] text-white hover:bg-[#16A34A]/90 text-xs"
                          onClick={() => handleGenerate(req)}
                          disabled={actionLoading && generatingFor === req.id}
                        >
                          {actionLoading && generatingFor === req.id ? (
                            <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /><span className="truncate">Generating...</span></>
                          ) : (
                            <><KeyRound className="h-3.5 w-3.5 mr-1.5 shrink-0" /><span className="truncate">Generate Reset Link</span></>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-9 text-gray-600 border-gray-300 hover:bg-gray-50 text-xs"
                          onClick={() => setDismissConfirm(req)}
                          disabled={actionLoading}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">Dismiss</span>
                        </Button>
                      </>
                    )}
                    {req.status === 'link_generated' && req.hasActiveToken && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-9 border-blue-300 text-blue-700 hover:bg-blue-50 text-xs"
                        onClick={() => handleGenerate(req)}
                        disabled={actionLoading && generatingFor === req.id}
                      >
                        {actionLoading && generatingFor === req.id ? (
                          <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /><span className="truncate">Generating...</span></>
                        ) : (
                          <><KeyRound className="h-3.5 w-3.5 mr-1.5 shrink-0" /><span className="truncate">Generate New Link</span></>
                        )}
                      </Button>
                    )}
                    {req.status === 'dismissed' && (
                      <span className="text-xs text-gray-500 italic flex-1">Dismissed{req.resolvedAt ? ` · ${formatTimeAgo(req.resolvedAt)}` : ''}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Generated link modal (with copy to clipboard) ─── */}
      <Dialog open={!!generatedLink} onOpenChange={(o) => { if (!o) { setGeneratedLink(null); setCopied(false); } }}>
        <DialogContent className="sm:max-w-lg z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#16A34A]" />
              Reset link ready
            </DialogTitle>
            <DialogDescription>
              Email this link to <strong>{generatedLink?.userEmail}</strong>. The link expires in 1 hour and can only be used once. After the agent resets their password, this link becomes invalid.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Recipient confirmation */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-[10px] text-blue-700 uppercase tracking-wider font-medium mb-1">Recipient</p>
              <p className="text-sm font-semibold text-gray-900">{generatedLink?.userName}</p>
              <p className="text-xs text-blue-800">{generatedLink?.userEmail}</p>
            </div>

            {/* The link with copy button */}
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Reset URL (click to copy)</Label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0 p-2.5 rounded-md bg-gray-50 border border-gray-200 font-mono text-[11px] text-gray-700 overflow-x-auto whitespace-nowrap">
                  {generatedLink?.url}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopy}
                  className={copied ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-[#16A34A] text-white hover:bg-[#16A34A]/90'}
                >
                  {copied ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied!</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy</>}
                </Button>
              </div>
            </div>

            {/* Email template suggestion */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-[10px] text-amber-800 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
                <Mail className="h-3 w-3" />Suggested email template
              </p>
              <p className="text-xs text-amber-900 whitespace-pre-wrap leading-relaxed">
                Hi {generatedLink?.userName?.split(' ')[0] || 'there'},{'\n\n'}You requested a password reset for your Gig Solutions account. Click the link below to set a new password:{'\n\n'}{generatedLink?.url}{'\n\n'}The link expires in 1 hour. If you didn't request this, you can safely ignore this email.{'\n\n'}— Gig Solutions Team
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs text-amber-700 hover:bg-amber-100"
                onClick={async () => {
                  const text = `Hi ${generatedLink?.userName?.split(' ')[0] || 'there'},\n\nYou requested a password reset for your Gig Solutions account. Click the link below to set a new password:\n\n${generatedLink?.url}\n\nThe link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\n— Gig Solutions Team`;
                  try { await navigator.clipboard.writeText(text); addToast({ title: 'Email template copied', variant: 'success' }); } catch {}
                }}
              >
                <Copy className="h-3 w-3 mr-1" />Copy email template
              </Button>
            </div>

            {/* Expiry warning */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              <span>Expires in <strong className="text-gray-700">{generatedLink ? formatExpiry(generatedLink.expiresAt) : ''}</strong></span>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => { setGeneratedLink(null); setCopied(false); }} className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dismiss confirmation ─── */}
      <AlertDialog open={!!dismissConfirm} onOpenChange={(o) => { if (!o) setDismissConfirm(null); }}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss this password reset request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the request from <strong>{dismissConfirm?.email}</strong> as dismissed. No reset link will be generated. The agent will not be notified — they will need to submit a new request if they still need to reset their password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDismissConfirmed}
              disabled={actionLoading}
            >
              {actionLoading ? 'Dismissing...' : 'Yes, Dismiss'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
