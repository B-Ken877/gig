'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, FileText, Calendar, MessageCircle, ArrowRight, AlertCircle, RefreshCw,
  Briefcase, MapPin, Clock, CheckCircle2, DollarSign, ChevronRight, ShieldCheck, X,
  TrendingUp, CalendarClock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import VideoAssessmentModal from '@/components/portal/VideoAssessmentModal';
import type { JobPost, Placement } from '@/lib/types';

const PAY_FREQ_TEXT: Record<string, string> = {
  'hourly': 'Paid hourly', 'weekly': 'Paid weekly',
  'bi-weekly': 'Paid bi-weekly', 'monthly': 'Paid monthly',
};

export default function AgentDashboard() {
  const { currentUser, navigateTo, addToast, pendingJobId, setPendingJobId } = useAppStore();
  const [agent, setAgent] = useState<any>(null);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [salaryDates, setSalaryDates] = useState<any[]>([]);
  const [idVerificationStatus, setIdVerificationStatus] = useState<string>('unverified');
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessmentJob, setAssessmentJob] = useState<JobPost | null>(null);
  const [submittingApp, setSubmittingApp] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    const headers = { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role };
    setError(null);
    try {
      const [agentRes, jobsRes, msgsRes] = await Promise.all([
        fetch('/api/agents?userId=' + currentUser.id, { headers }),
        fetch('/api/job-posts', { headers }),
        fetch('/api/messages?userId=' + currentUser.id, { headers }).catch(() => null),
      ]);
      const agentData = await agentRes.json();
      const me = agentData.id ? agentData : (agentData.agents || []).find((a: any) => a.userId === currentUser.id);
      if (me) {
        setAgent(me);
        const [appsRes2, placementsRes2, salaryRes2] = await Promise.all([
          fetch('/api/job-applications?agentId=' + me.id, { headers }).then(r => r.json()).catch(() => ({ applications: [] })),
          fetch('/api/placements?agentId=' + me.id, { headers }).then(r => r.json()).catch(() => ({ placements: [] })),
          fetch('/api/salary-dates', { headers }).then(r => r.json()).catch(() => ({ salaryDates: [] })),
        ]);
        setAppliedIds(new Set((appsRes2.applications || []).map((a: any) => a.jobPostId)));
        setPlacements(placementsRes2.placements || []);
        setSalaryDates(salaryRes2.salaryDates || []);
        setIdVerificationStatus(me.idVerificationStatus || 'unverified');
        if ((me.idVerificationStatus || 'unverified') !== 'verified' && !sessionStorage.getItem('verifyPopupDismissed')) {
          setShowVerifyPopup(true);
        }
      }
      const jobsData = await jobsRes.json();
      setJobs(jobsData.jobPosts || []);
      if (msgsRes && msgsRes.ok) {
        const msgData = await msgsRes.json();
        setUnreadMsgs((msgData.conversations || []).reduce((s: number, c: any) => s + (c.unreadCount || 0), 0));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    loadData();
    pollRef.current = setInterval(loadData, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [currentUser, loadData]);

  useEffect(() => {
    if (!pendingJobId || jobs.length === 0 || !agent) return;
    const target = jobs.find(j => j.id === pendingJobId);
    if (target) setAssessmentJob(target);
  }, [pendingJobId, jobs, agent]);

  const handleApply = (job: JobPost) => {
    if (appliedIds.has(job.id)) {
      addToast({ title: 'Already Applied', description: 'You have already applied for this job.', variant: 'default' });
      return;
    }
    // ─── ID VERIFICATION GATE ────────────────────────────────────────────
    // Only verified agents can apply for jobs. If unverified/pending/rejected,
    // show a popup prompting them to verify first.
    if (idVerificationStatus !== 'verified') {
      const msg = idVerificationStatus === 'pending'
        ? 'Your ID verification is under review. You can apply once it is approved (usually 1-2 business days).'
        : idVerificationStatus === 'rejected'
        ? 'Your ID verification was not approved. Please resubmit your verification to apply for jobs.'
        : 'You must verify your identity before applying for jobs. It only takes 3 minutes.';
      addToast({
        title: 'Identity Verification Required',
        description: msg,
        variant: 'destructive',
      });
      // Redirect to the verification page
      navigateTo('agent-verify-id' as never);
      return;
    }
    // Check the job has assessment questions
    if (!job.assessmentQuestions || job.assessmentQuestions.length === 0) {
      addToast({ title: 'Assessment not ready', description: 'This job does not have assessment questions configured yet. Please try again later.', variant: 'destructive' });
      return;
    }
    setAssessmentJob(job);
  };

  const handleAssessmentComplete = async (result: { videoResponses: any[] }) => {
    if (!assessmentJob || !currentUser) return;
    setSubmittingApp(true);
    try {
      const res = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role },
        body: JSON.stringify({
          jobPostId: assessmentJob.id,
          videoResponses: result.videoResponses,
        }),
      });
      if (res.ok) {
        addToast({
          title: 'Application Submitted!',
          description: 'Your video responses have been submitted for "' + assessmentJob.jobTitle + '". We will review and reach out soon.',
          variant: 'success',
        });
        setAppliedIds(prev => new Set([...prev, assessmentJob.id]));
        setPendingJobId(null);
        setAssessmentJob(null);
        loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Failed to submit', description: data.error || 'Please try again', variant: 'destructive' });
      }
    } catch (e) {
      addToast({ title: 'Network error', description: 'Please try again', variant: 'destructive' });
    } finally {
      setSubmittingApp(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50"><CardContent className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-red-700 mb-1">Failed to load dashboard</p>
        <p className="text-xs text-red-500 mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={loadData} className="border-red-300 text-red-600 hover:bg-red-100">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
        </Button>
      </CardContent></Card>
    );
  }

  const activePlacements = placements.filter(p => p.status === 'active');
  const nextSalary = activePlacements.map(p => p.nextSalaryDate).filter(Boolean).sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0];

  const quickActions = [
    { label: 'My Work', desc: activePlacements.length + ' active placement' + (activePlacements.length !== 1 ? 's' : ''), page: 'agent-my-work' as const, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'My Applications', desc: appliedIds.size + ' application' + (appliedIds.size !== 1 ? 's' : '') + ' submitted', page: 'agent-applications' as const, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Edit Profile', desc: 'Update your personal info and skills', page: 'agent-profile' as const, icon: User, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Documents', desc: 'Upload your resume, ID, certificates', page: 'agent-documents' as const, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Availability', desc: 'Set your available dates and shifts', page: 'agent-availability' as const, icon: Calendar, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Messages', desc: unreadMsgs + ' unread message' + (unreadMsgs !== 1 ? 's' : ''), page: 'messages' as const, icon: MessageCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-[#0B1A2E] via-[#0f2540] to-[#16325a] px-6 py-5 text-white relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#16A34A]/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="relative flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 ring-2 ring-[#16A34A]/40 shadow-xl">
                  {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser?.name || 'User'} />}
                  <AvatarFallback className="bg-[#16A34A] text-white text-xl font-bold">
                    {(currentUser?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {idVerificationStatus === 'verified' && (
                  <span className="absolute -bottom-1 -right-1 bg-[#16A34A] rounded-full p-1 ring-2 ring-white">
                    <ShieldCheck className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{currentUser?.name?.split(' ')[0]}</h2>
                  {idVerificationStatus === 'verified' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/20 text-[#4ADE80] text-[10px] font-semibold uppercase tracking-wide">Verified</span>
                  )}
                </div>
                <p className="text-sm text-gray-300 mt-0.5">{agent?.country || 'Remote Agent'} {agent?.preferredShift ? '· ' + agent.preferredShift + ' Shift' : ''}</p>
                {agent?.languages?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <span className="opacity-60">Languages:</span> {agent.languages.join(', ')}
                  </p>
                )}
              </div>
            </div>
            {agent?.skills?.length > 0 && (
              <div className="relative flex flex-wrap gap-1.5 mt-4">
                {agent.skills.slice(0, 6).map((s: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium">{s}</span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ID Verification Popup Modal */}
      {showVerifyPopup && idVerificationStatus !== 'verified' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={() => { setShowVerifyPopup(false); sessionStorage.setItem('verifyPopupDismissed', '1'); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowVerifyPopup(false); sessionStorage.setItem('verifyPopupDismissed', '1'); }} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${idVerificationStatus === 'pending' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              {idVerificationStatus === 'pending' ? (
                <Clock className="h-7 w-7 text-amber-600" />
              ) : (
                <ShieldCheck className="h-7 w-7 text-blue-600" />
              )}
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {idVerificationStatus === 'pending' ? 'Verification Under Review' : 'Verify Your Identity'}
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              {idVerificationStatus === 'pending'
                ? 'Your ID is being reviewed. You\'ll be notified within 1-2 business days.'
                : 'You must verify your identity to apply for jobs. It takes about 3 minutes.'
              }
            </p>
            {idVerificationStatus !== 'pending' && (
              <Button size="sm" className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90 mb-2" onClick={() => { setShowVerifyPopup(false); navigateTo('agent-verify-id' as never); }}>
                Verify Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
            <button onClick={() => { setShowVerifyPopup(false); sessionStorage.setItem('verifyPopupDismissed', '1'); }} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
              {idVerificationStatus === 'pending' ? 'Close' : 'Maybe Later'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-dashboard' as never)}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Briefcase className="h-4 w-4 text-blue-600" /></div>
            <div className="min-w-0"><p className="text-[10px] text-gray-500">Open Jobs</p><p className="text-lg font-bold leading-tight">{jobs.length}</p></div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-applications' as never)}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
            <div className="min-w-0"><p className="text-[10px] text-gray-500">Applications</p><p className="text-lg font-bold leading-tight">{appliedIds.size}</p></div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-my-work' as never)}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0"><TrendingUp className="h-4 w-4 text-purple-600" /></div>
            <div className="min-w-0"><p className="text-[10px] text-gray-500">Active Work</p><p className="text-lg font-bold leading-tight">{activePlacements.length}</p></div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('messages' as never)}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0"><MessageCircle className="h-4 w-4 text-amber-600" /></div>
            <div className="min-w-0"><p className="text-[10px] text-gray-500">Unread Messages</p><p className="text-lg font-bold leading-tight">{unreadMsgs}</p></div>
          </CardContent>
        </Card>
      </div>

      {nextSalary && (
        <Card className="bg-gradient-to-r from-[#16A34A] to-[#22c55e] border-0">
          <CardContent className="p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><DollarSign className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-white/80">Next Payday</p>
                <p className="text-lg font-bold">{new Date(nextSalary).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => navigateTo('agent-my-work' as never)}>
                View Details <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-green-600" />
              <h3 className="text-sm font-semibold">Available Jobs</h3>
              <Badge variant="secondary" className="text-xs">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</Badge>
            </div>
          </div>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No jobs posted yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 8).map(job => {
                const isApplied = appliedIds.has(job.id);
                return (
                  <div key={job.id} className="border rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">{job.jobTitle}</h4>
                          {isApplied && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
                              <CheckCircle2 className="h-3 w-3" />Applied
                            </span>
                          )}
                          {job.category && <Badge variant="outline" className="text-[10px]">{job.category}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location || 'Remote'}</span>
                          {job.hourlyRate > 0 && <span className="flex items-center gap-1 text-[#16A34A] font-semibold"><DollarSign className="h-3 w-3" />{job.hourlyRate.toFixed(2)}/hr</span>}
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{PAY_FREQ_TEXT[job.payFrequency] || 'Paid bi-weekly'}</span>
                          {job.shift && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.shift}</span>}
                        </div>
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{job.description}</p>
                      </div>
                      <Button
                        size="sm"
                        className={isApplied
                          ? 'bg-gray-100 text-gray-400 hover:bg-gray-100 text-xs shrink-0 h-8 cursor-default'
                          : 'bg-[#16A34A] text-white hover:bg-[#16A34A]/90 text-xs shrink-0 h-8'}
                        onClick={() => !isApplied && handleApply(job)}
                        disabled={isApplied}
                      >
                        {isApplied ? (<><CheckCircle2 className="h-3 w-3 mr-1" />Applied</>) : (<>Apply <ArrowRight className="h-3 w-3 ml-1" /></>)}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {jobs.length > 8 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => navigateTo('careers' as never)}>
                    View All Jobs on Career Page <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        {quickActions.map(a => {
          const Icon = a.icon;
          return (
            <Card key={a.page} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(a.page)}>
              <CardContent className="p-3 flex flex-col items-center text-center">
                <div className={"h-10 w-10 rounded-lg " + a.bg + " flex items-center justify-center mb-2"}>
                  <Icon className={"h-5 w-5 " + a.color} />
                </div>
                <h3 className="text-xs font-semibold">{a.label}</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">{a.desc}</p>
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
            <p className="text-sm text-amber-700 mb-3">Your agent profile hasn&apos;t been set up yet. Complete your profile to apply for jobs.</p>
            <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => navigateTo('agent-profile')}>
              <User className="h-3.5 w-3.5 mr-1.5" />Set Up Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Video Assessment Modal */}
      {assessmentJob && (
        <VideoAssessmentModal
          job={assessmentJob}
          onClose={() => { setAssessmentJob(null); setPendingJobId(null); }}
          onComplete={handleAssessmentComplete}
        />
      )}

      {/* Submitting overlay */}
      {submittingApp && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
            <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full mb-3" />
            <p className="text-sm text-gray-600">Submitting your application...</p>
          </div>
        </div>
      )}
    </div>
  );
}
