'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, FileText, Calendar, MessageCircle, ArrowRight, AlertCircle, RefreshCw,
  Briefcase, MapPin, Clock, CheckCircle2, Building2, DollarSign, ChevronRight,
  Sparkles, TrendingUp, Award, PlayCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import JobAssessmentModal from '@/components/portal/JobAssessmentModal';
import type { JobPost, Placement } from '@/lib/types';

const PAY_LABEL: Record<string, string> = {
  'hourly': 'per hour', 'weekly': 'per week', 'bi-weekly': 'bi-weekly', 'monthly': 'per month',
};

export default function AgentDashboard() {
  const { currentUser, navigateTo, addToast, pendingJobId, setPendingJobId } = useAppStore();
  const [agent, setAgent] = useState<any>(null);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingJob, setApplyingJob] = useState<JobPost | null>(null);
  const [assessmentJob, setAssessmentJob] = useState<JobPost | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    const headers = { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role };
    setError(null);
    try {
      const [agentRes, jobsRes, appsRes, placementsRes, msgsRes] = await Promise.all([
        fetch('/api/agents?userId=' + currentUser.id, { headers }),
        fetch('/api/job-posts', { headers }),
        fetch('/api/job-applications?agentId=' + (currentUser as any)._agentId, { headers }).catch(() => null),
        fetch('/api/placements?agentId=' + (currentUser as any)._agentId, { headers }).catch(() => null),
        fetch('/api/messages?userId=' + currentUser.id, { headers }).catch(() => null),
      ]);

      const agentData = await agentRes.json();
      const me = agentData.id ? agentData : (agentData.agents || []).find((a: any) => a.userId === currentUser.id);
      if (me) {
        setAgent(me);
        // Now fetch applications & placements using the real agentId
        const [appsRes2, placementsRes2] = await Promise.all([
          fetch('/api/job-applications?agentId=' + me.id, { headers }).then(r => r.json()).catch(() => ({ applications: [] })),
          fetch('/api/placements?agentId=' + me.id, { headers }).then(r => r.json()).catch(() => ({ placements: [] })),
        ]);
        setAppliedIds(new Set((appsRes2.applications || []).map((a: any) => a.jobPostId)));
        setPlacements(placementsRes2.placements || []);
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

  // ─── Pending job assessment flow ────────────────────────────────────────
  // If the user clicked "Apply" on the career page (or followed a shared
  // job link), pendingJobId will be set. We auto-open the assessment modal
  // for that specific job.
  useEffect(() => {
    if (!pendingJobId || jobs.length === 0 || !agent) return;
    const target = jobs.find(j => j.id === pendingJobId);
    if (target) {
      setAssessmentJob(target);
    }
  }, [pendingJobId, jobs, agent]);

  const handleApply = (job: JobPost) => {
    if (appliedIds.has(job.id)) {
      addToast({ title: 'Already Applied', description: 'You have already applied for this job.', variant: 'default' });
      return;
    }
    setAssessmentJob(job);
  };

  const handleAssessmentComplete = async (result: { passed: boolean; score: number; answers: any[] }) => {
    if (!result.passed || !assessmentJob || !currentUser) {
      // Failed — keep modal open so the user can retry (handled inside the modal)
      return;
    }
    // Save the assessment + create the application
    try {
      const res = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role },
        body: JSON.stringify({
          jobPostId: assessmentJob.id,
          assessmentScore: result.score,
          assessmentPassed: result.passed,
          answers: result.answers,
        }),
      });
      if (res.ok) {
        addToast({
          title: 'Application Submitted!',
          description: 'You applied for "' + assessmentJob.jobTitle + '". Our team will review and reach out.',
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
    }
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
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load dashboard</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="border-red-300 text-red-600 hover:bg-red-100">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activePlacements = placements.filter(p => p.status === 'active');
  const nextSalary = activePlacements
    .map(p => p.nextSalaryDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0];

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
      {/* Welcome card */}
      <Card className="bg-gradient-to-r from-[#0B1A2E] to-[#1a2d4a] border-0">
        <CardContent className="p-6 text-white">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-white/20 shadow-lg">
              {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser?.name || 'User'} />}
              <AvatarFallback className="bg-[#16A34A] text-white text-lg font-bold">
                {(currentUser?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">Welcome back, {currentUser?.name?.split(' ')[0]}!</h2>
              <p className="text-sm text-gray-300 mt-1">Browse open positions below. Apply with a quick skills assessment.</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-dashboard' as never)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Open Jobs</p>
                <p className="text-2xl font-bold mt-1">{jobs.length}</p>
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
                <p className="text-sm text-gray-500">Applications</p>
                <p className="text-2xl font-bold mt-1">{appliedIds.size}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-my-work' as never)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Work</p>
                <p className="text-2xl font-bold mt-1">{activePlacements.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
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

      {/* Next payday banner */}
      {nextSalary && (
        <Card className="bg-gradient-to-r from-[#16A34A] to-[#22c55e] border-0">
          <CardContent className="p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
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

      {/* Available jobs */}
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
                          {job.category && (
                            <Badge variant="outline" className="text-[10px]">{job.category}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location || 'Remote'}</span>
                          {job.hourlyRate > 0 && (
                            <span className="flex items-center gap-1 text-[#16A34A] font-semibold"><DollarSign className="h-3 w-3" />${job.hourlyRate.toFixed(2)} {PAY_LABEL[job.payFrequency] || ''}</span>
                          )}
                          {job.shift && (
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.shift}</span>
                          )}
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{job.description}</p>
                        {job.skills && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.skills.slice(0, 4).map((s, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                            ))}
                          </div>
                        )}
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

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Profile summary */}
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

      {/* Assessment modal */}
      {assessmentJob && (
        <JobAssessmentModal
          jobId={assessmentJob.id}
          jobTitle={assessmentJob.jobTitle}
          onClose={() => { setAssessmentJob(null); setPendingJobId(null); }}
          onComplete={handleAssessmentComplete}
        />
      )}
    </div>
  );
}
