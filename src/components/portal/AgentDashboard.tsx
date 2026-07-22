'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { User, FileText, Calendar, MessageCircle, ArrowRight, AlertCircle, RefreshCw, Briefcase, MapPin, Clock, Building2, CheckCircle2, CreditCard, Lock, ShieldCheck, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { VerifiedBadge, VerifiedBadgeStyles, VerifiedBadgeStack, topVerificationTier, type VerificationTier } from '@/components/ui/verified-badge';

interface ClientNeed {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  createdAt: string;
  client: {
    id?: string;
    companyName: string;
    industry: string | null;
    companyLink?: string | null;
    user?: { id?: string; avatar?: string | null };
  };
}

const POLL_INTERVAL = 15000;

export default function AgentDashboard() {
  const { currentUser, navigateTo, addToast } = useAppStore();
  const [agent, setAgent] = useState<any>(null);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [needs, setNeeds] = useState<ClientNeed[]>([]);
  const [needsLoading, setNeedsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [totalApplications, setTotalApplications] = useState(0);
  const [applyingNeed, setApplyingNeed] = useState<string | null>(null);
  // Payment gate modal — when an unpaid agent clicks "I'm Interested", we
  // show a payment card (tier + price + Pay & Activate button) instead of
  // immediately redirecting to the payment chat.
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const loadData = useCallback(() => {
    if (!currentUser) return;
    const headers = { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role };

    Promise.all([
      fetch('/api/agents?userId=' + currentUser.id, { headers }).then(r => {
        if (!r.ok) throw new Error('Failed to load profile');
        return r.json();
      }),
      fetch('/api/messages?userId=' + currentUser.id, { headers }).then(r => {
        if (!r.ok) throw new Error('Failed to load messages');
        return r.json();
      }),
      fetch('/api/call-center-needs', { headers }).then(r => {
        if (!r.ok) throw new Error('Failed to load needs');
        return r.json();
      }),
      fetch('/api/call-center-needs/interest', { headers }).then(r => {
        if (!r.ok) return { applications: [] };
        return r.json();
      }),

    ])
      .then(([agentData, msgData, needsData, interestData]) => {
        if (!isMountedRef.current) return;
        if (agentData && agentData.id) {
          setAgent(agentData);
        } else if (agentData.agents) {
          const me = agentData.agents.find((a: any) => a.userId === currentUser.id);
          if (me) setAgent(me);
        }
        if (msgData.conversations) {
          setUnreadMsgs(msgData.conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0));
        }
        if (needsData.needs) setNeeds(needsData.needs);
        const apps = interestData.applications || [];
        setTotalApplications(apps.length);
        setAppliedIds(new Set(apps.map((a: any) => a.needId).filter(Boolean)));
      })
      .catch(err => {
        if (isMountedRef.current) setError(err.message);
      })
      .finally(() => {
        if (isMountedRef.current) { setLoading(false); setNeedsLoading(false); }
      });
  }, [currentUser]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    loadData();
    pollRef.current = setInterval(loadData, POLL_INTERVAL);
    return () => {
      isMountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentUser, loadData]);

  const handleApply = (need: ClientNeed) => {
    if (applyingNeed || appliedIds.has(need.id)) return;
    // ─── Payment gate ──────────────────────────────────────────────────
    // Agents need an active subscription to apply. If unpaid or expired,
    // show a payment card modal (tier + price + Pay & Activate button)
    // instead of immediately redirecting to the payment chat.
    const paidUntil = (currentUser as any)?.paidUntil;
    const isPaid = !!(currentUser as any)?.paid && paidUntil && new Date(paidUntil) > new Date();
    if (!isPaid) {
      setShowPaymentModal(true);
      return;
    }
    setApplyingNeed(need.id);
    fetch('/api/call-center-needs/interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser!.id, 'X-User-Role': currentUser!.role },
      body: JSON.stringify({ needId: need.id }),
    })
      .then(r => {
        if (r.ok) {
          setAppliedIds(prev => new Set([...prev, need.id]));
          setTotalApplications(prev => prev + 1);
          addToast({ title: 'Application Sent!', description: 'You have successfully applied for "' + need.title + '". ' + (need.client?.companyName || 'The call center') + ' has been notified and will respond in your Messages.', variant: 'success' });
          loadData();
        } else if (r.status === 409) {
          setAppliedIds(prev => new Set([...prev, need.id]));
          addToast({ title: 'Already Applied', description: 'You have already applied for this need.', variant: 'default' });
        } else if (r.status === 402) {
          // Server also enforces the gate — show the payment modal
          setShowPaymentModal(true);
        } else {
          return r.json().then(d => { throw new Error(d.error || 'Failed'); });
        }
      })
      .catch(err => addToast({ title: 'Error', description: err.message, variant: 'destructive' }))
      .finally(() => setApplyingNeed(null));
  };

  const quickActions = [
    { label: 'Edit Profile', desc: 'Update your personal info and skills', page: 'agent-profile' as const, icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Documents', desc: 'Upload your resume, ID, certificates', page: 'agent-documents' as const, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Availability', desc: 'Set your available dates and shifts', page: 'agent-availability' as const, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Messages', desc: unreadMsgs + ' unread message' + (unreadMsgs !== 1 ? 's' : ''), page: 'messages' as const, icon: MessageCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'My Applications', desc: totalApplications + ' application' + (totalApplications !== 1 ? 's' : '') + ' submitted', page: 'agent-applications' as const, icon: Briefcase, color: 'text-green-600', bg: 'bg-green-50' },
  ];

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
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load dashboard</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="border-red-300 text-red-600 hover:bg-red-100">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <VerifiedBadgeStyles />
      <Card className="bg-gradient-to-r from-[#0B1A2E] to-[#1a2d4a] border-0">
        <CardContent className="p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-14 w-14 ring-2 ring-white/20 shadow-lg">
                {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser?.name || 'User'} />}
                <AvatarFallback className="bg-[#16A34A] text-white text-lg font-bold">
                  {(currentUser?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {(() => {
                const tiers: VerificationTier[] = Array.isArray((currentUser as any)?.verificationTiers) ? (currentUser!.verificationTiers as VerificationTier[]) : [];
                const topTier = topVerificationTier(tiers);
                return topTier ? (
                  <span className="absolute -bottom-1 -right-1">
                    <VerifiedBadge tier={topTier} iconOnly size="sm" verifiedAt={(currentUser as any)?.verifiedAt} />
                  </span>
                ) : null;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">Welcome back, {currentUser?.name?.split(' ')[0]}!</h2>
              </div>
              <p className="text-sm text-gray-300 mt-1">Your profile is active and visible to call centers browsing the agent bank.</p>
              {(() => {
                const tiers: VerificationTier[] = Array.isArray((currentUser as any)?.verificationTiers) ? (currentUser!.verificationTiers as VerificationTier[]) : [];
                return tiers.length > 0 ? (
                  <div className="mt-2"><VerifiedBadgeStack tiers={tiers} size="xs" /></div>
                ) : null;
              })()}
            </div>
          </div>
          {agent?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {agent.skills.slice(0, 6).map((s: string, i: number) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-medium">{s}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-dashboard' as never)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available Jobs</p>
                <p className="text-2xl font-bold mt-1">{needs.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-applications' as never)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">My Applications</p>
                <p className="text-2xl font-bold mt-1">{totalApplications}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('messages' as never)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unread Messages</p>
                <p className="text-2xl font-bold mt-1">{unreadMsgs}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-green-600" />
              <h3 className="text-sm font-semibold">Available Jobs</h3>
              <Badge variant="secondary" className="text-xs">{needs.length} job{needs.length !== 1 ? "s" : ""}{needs.filter(n => !appliedIds.has(n.id)).length > 0 ? " · " + needs.filter(n => !appliedIds.has(n.id)).length + " new" : ""}</Badge>
            </div>
          </div>
          {needsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full" />
            </div>
          ) : needs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No jobs posted yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {needs.map(need => {
                const isApplied = appliedIds.has(need.id);
                const isApplying = applyingNeed === need.id;
                return (
                  <div key={need.id} className="border rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{need.title}</h4>
                          {isApplied && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
                              <CheckCircle2 className="h-3 w-3" />Applied
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Avatar className="h-4 w-4">
                              {need.client?.user?.avatar && <AvatarImage src={need.client.user.avatar} alt={need.client?.companyName || 'Call Center'} />}
                              <AvatarFallback className="bg-[#0B1A2E] text-white text-[8px] font-bold">{(need.client?.companyName || 'CC').slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <Building2 className="h-3 w-3" />{need.client?.companyName || 'Call Center'}
                          </span>
                          {need.client?.industry && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MapPin className="h-3 w-3" />{need.client.industry}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />{new Date(need.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {need.description && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{need.description}</p>
                        )}
                        {need.requirements && need.requirements.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {need.requirements.slice(0, 5).map((req, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{req}</Badge>
                            ))}
                            {need.requirements.length > 5 && (
                              <span className="text-[10px] text-gray-400 self-center">+{need.requirements.length - 5} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className={
                          isApplied
                            ? 'bg-gray-100 text-gray-400 hover:bg-gray-100 text-xs shrink-0 h-8 cursor-default'
                            : 'bg-[#16A34A] text-white hover:bg-[#16A34A]/90 text-xs shrink-0 h-8'
                        }
                        onClick={() => !isApplied && handleApply(need)}
                        disabled={isApplied || isApplying}
                      >
                        {isApplying ? 'Sending...' : isApplied ? 'Applied' : "I'm Interested"}
                        {!isApplied && !isApplying && <ArrowRight className="h-3 w-3 ml-1" />}
                        {isApplied && <CheckCircle2 className="h-3 w-3 ml-1" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map(a => {
          const Icon = a.icon;
          return (
            <Card key={a.page} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(a.page)}>
              <CardContent className="p-5">
                <div className={"h-10 w-10 rounded-lg " + a.bg + " flex items-center justify-center mb-3"}>
                  <Icon className={"h-5 w-5 " + a.color} />
                </div>
                <h3 className="text-sm font-semibold">{a.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{a.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

            {agent && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3">Profile Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">Country</span><p className="font-medium mt-0.5">{agent.country || 'Not set'}</p></div>
              <div><span className="text-gray-500">Experience</span><p className="font-medium mt-0.5">{agent.experience} year{agent.experience !== 1 ? 's' : ''}</p></div>
              <div><span className="text-gray-500">Languages</span><p className="font-medium mt-0.5">{agent.languages?.join(', ') || 'Not set'}</p></div>
              <div><span className="text-gray-500">Preferred Shift</span><p className="font-medium mt-0.5">{agent.preferredShift || 'Flexible'}</p></div>
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigateTo('agent-profile')}>
              Edit Profile <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {!agent && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-amber-700 mb-3">Your agent profile hasn't been set up yet. Complete your profile to appear in search results.</p>
            <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => navigateTo('agent-profile')}>
              <User className="h-3.5 w-3.5 mr-1.5" />Set Up Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Payment gate modal ────────────────────────────────────────────
          Shown when an unpaid agent tries to apply for a job. Displays the
          subscription tier, price, and a "Pay & Activate" button that
          redirects to the payment chat (PendingPaymentPage). */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Subscription Required</h3>
              <p className="text-sm text-gray-600 mb-6">
                Activate your Agent Quarterly subscription to apply for jobs and get discovered by call centers.
              </p>

              {/* Price card */}
              <div className="w-full bg-gray-50 rounded-xl border border-amber-200 p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-amber-600" />
                    <span className="font-semibold text-gray-900">Agent Quarterly</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">3 months</Badge>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-gray-900">1,000</span>
                  <span className="text-sm font-medium text-gray-500">HTG / quarter</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Apply for any job on the platform for 3 months from activation.
                </div>
              </div>

              <Button
                className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90 py-3 text-base font-semibold"
                onClick={() => {
                  setShowPaymentModal(false);
                  navigateTo('pending-payment');
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay & Activate
              </Button>

              <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 max-w-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  You will be redirected to a chat with the admin to complete your payment.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}