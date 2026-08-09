'use client';
import { useState, useEffect } from 'react';
import {
  AlertCircle, RefreshCw, Briefcase, ClipboardList, CheckCircle2, XCircle,
  DollarSign, Calendar, MapPin, User, Clock, ChevronRight, Video, ArrowLeft,
  Play, Mail,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import type { JobApplication, JobPost } from '@/lib/types';

type View = 'jobs' | 'applicants' | 'recordings';

export default function AdminPlacements() {
  const { currentUser, addToast } = useAppStore();
  const [view, setView] = useState<View>('jobs');
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hireDialog, setHireDialog] = useState<JobApplication | null>(null);
  const [hireForm, setHireForm] = useState({ salary: '', startDate: '', nextSalaryDate: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const headers = currentUser
    ? { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin' }
    : {};

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/job-posts?all=1', { headers });
      const data = await res.json();
      setJobs(data.jobPosts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadApplicants = async (jobId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/job-applications?jobPostId=${jobId}`, { headers });
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); /* eslint-disable-next-line */ }, []);

  const handleJobClick = (job: JobPost) => {
    setSelectedJob(job);
    setView('applicants');
    loadApplicants(job.id);
  };

  const handleApplicantClick = (app: JobApplication) => {
    setSelectedApp(app);
    setView('recordings');
  };

  const handleBack = () => {
    if (view === 'recordings') {
      setView('applicants');
      setSelectedApp(null);
    } else if (view === 'applicants') {
      setView('jobs');
      setSelectedJob(null);
      setApplications([]);
    }
  };

  const handleHireClick = (app: JobApplication) => {
    setHireForm({
      salary: app.jobPost?.hourlyRate ? String(app.jobPost.hourlyRate) : '',
      startDate: new Date().toISOString().split('T')[0],
      nextSalaryDate: '',
    });
    setHireDialog(app);
  };

  const handleConfirmHire = async () => {
    if (!hireDialog) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/job-applications/${hireDialog.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'hired',
          salary: hireForm.salary,
          startDate: hireForm.startDate,
          nextSalaryDate: hireForm.nextSalaryDate || undefined,
        }),
      });
      if (res.ok) {
        addToast({ title: 'Agent Hired!', description: 'The agent has been notified.', variant: 'success' });
        setHireDialog(null);
        // Refresh
        if (selectedJob) loadApplicants(selectedJob.id);
      } else {
        addToast({ title: 'Failed to hire', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (app: JobApplication) => {
    if (!confirm('Reject this application? The agent will be notified.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/job-applications/${app.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (res.ok) {
        addToast({ title: 'Application rejected', variant: 'success' });
        if (selectedJob) loadApplicants(selectedJob.id);
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && view === 'jobs') {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50"><CardContent className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <Button variant="outline" size="sm" onClick={loadJobs}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
      </CardContent></Card>
    );
  }

  // ─── VIEW: JOBS LIST ─────────────────────────────────────────────────────
  if (view === 'jobs') {
    const jobsWithApps = jobs.filter(j => (j._count?.applications || 0) > 0);
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Applications</h2>
          <p className="text-sm text-gray-500">Click a job to see the agents who applied.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Jobs with Applications</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{jobsWithApps.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Applications</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{jobs.reduce((s, j) => s + (j._count?.applications || 0), 0)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-gray-500">Active Placements</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{jobs.reduce((s, j) => s + (j._count?.placements || 0), 0)}</p>
          </CardContent></Card>
        </div>

        {jobsWithApps.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No applications yet.</p>
            <p className="text-xs mt-1">When agents apply for jobs, they&apos;ll appear here.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {jobsWithApps.map(job => (
              <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleJobClick(job)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{job.category || 'Uncategorized'}</Badge>
                        {job.shift && <Badge variant="outline" className="text-[10px]">{job.shift}</Badge>}
                      </div>
                      <h3 className="font-semibold text-gray-900">{job.jobTitle}</h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location || 'Remote'}</span>
                        {job.hourlyRate > 0 && <span className="flex items-center gap-1 text-[#16A34A] font-semibold"><DollarSign className="h-3 w-3" />{job.hourlyRate.toFixed(2)}/hr</span>}
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-[#16A34A]">{job._count?.applications || 0}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Applicants</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── VIEW: APPLICANTS LIST ───────────────────────────────────────────────
  if (view === 'applicants' && selectedJob) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}><ArrowLeft className="h-4 w-4 mr-1" />Back to Jobs</Button>
        </div>
        <div>
          <h2 className="text-lg font-semibold">{selectedJob.jobTitle}</h2>
          <p className="text-sm text-gray-500">{applications.length} applicant{applications.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>
        ) : applications.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">
            <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No applicants for this job yet.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {applications.map(app => {
              const status = app.status;
              const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
                applied: { label: 'Pending Review', color: 'text-blue-700', bg: 'bg-blue-100' },
                hired: { label: 'Hired', color: 'text-green-700', bg: 'bg-green-100' },
                rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
              };
              const sc = statusConfig[status] || statusConfig.applied;
              return (
                <Card key={app.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleApplicantClick(app)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          {app.agent?.avatar && <AvatarImage src={app.agent.avatar} alt={app.agent?.name || 'Agent'} />}
                          <AvatarFallback className="bg-[#16A34A] text-white text-xs font-bold">
                            {(app.agent?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{app.agent?.name || 'Agent'}</h3>
                            <Badge variant="secondary" className={`text-[10px] uppercase ${sc.bg} ${sc.color}`}>{sc.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                            {app.agent?.country && <span><MapPin className="h-3 w-3 inline mr-0.5" />{app.agent.country}</span>}
                            {app.agent?.experience != null && <span>{app.agent.experience} yr exp</span>}
                            <span><Video className="h-3 w-3 inline mr-0.5" />{app.videoCount || 0} video responses</span>
                            <span><Clock className="h-3 w-3 inline mr-0.5" />Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        {status === 'applied' && (
                          <>
                            <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => handleHireClick(app)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Hire
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleReject(app)}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleApplicantClick(app)}>
                          <Play className="h-3.5 w-3.5 mr-1" />View Videos
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── VIEW: VIDEO RECORDINGS ──────────────────────────────────────────────
  if (view === 'recordings' && selectedApp && selectedJob) {
    const videos = selectedApp.videoResponses || [];
    const status = selectedApp.status;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}><ArrowLeft className="h-4 w-4 mr-1" />Back to Applicants</Button>
        </div>

        {/* Applicant info */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {selectedApp.agent?.avatar && <AvatarImage src={selectedApp.agent.avatar} alt={selectedApp.agent?.name || 'Agent'} />}
                <AvatarFallback className="bg-[#16A34A] text-white text-lg font-bold">
                  {(selectedApp.agent?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{selectedApp.agent?.name}</h2>
                <p className="text-sm text-gray-500">Applied for {selectedJob.jobTitle}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  {selectedApp.agent?.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedApp.agent.email}</span>}
                  {selectedApp.agent?.country && <span><MapPin className="h-3 w-3 inline mr-0.5" />{selectedApp.agent.country}</span>}
                  {selectedApp.agent?.experience != null && <span>{selectedApp.agent.experience} yr exp</span>}
                </div>
                {selectedApp.agent?.skills && selectedApp.agent.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedApp.agent.skills.map((s: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>)}
                  </div>
                )}
              </div>
              {status === 'applied' && (
                <div className="flex flex-col gap-2 shrink-0">
                  <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => handleHireClick(selectedApp)} disabled={actionLoading}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />Hire Agent
                  </Button>
                  <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleReject(selectedApp)} disabled={actionLoading}>
                    <XCircle className="h-4 w-4 mr-2" />Reject
                  </Button>
                </div>
              )}
              {status === 'hired' && <Badge className="bg-green-100 text-green-700 text-xs uppercase">Hired</Badge>}
              {status === 'rejected' && <Badge className="bg-red-100 text-red-700 text-xs uppercase">Rejected</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Video recordings */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Video className="h-4 w-4 text-[#16A34A]" />Video Responses ({videos.length})
          </h3>
          {videos.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">
              <Video className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No video responses found.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {videos.sort((a, b) => a.questionIndex - b.questionIndex).map((v) => (
                <Card key={v.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white text-xs font-bold">{v.questionIndex + 1}</span>
                      <p className="text-sm font-medium text-gray-900 flex-1">{v.questionText}</p>
                    </div>
                    <div className="rounded-xl overflow-hidden bg-black">
                      <video src={v.videoUrl} controls playsInline className="w-full" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {v.durationSeconds ? `${Math.floor(v.durationSeconds / 60)}:${(v.durationSeconds % 60).toString().padStart(2, '0')} duration · ` : ''}Recorded {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Hire dialog
  return (
    <Dialog open={!!hireDialog} onOpenChange={(o) => { if (!o) setHireDialog(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hire {hireDialog?.agent?.name || 'Agent'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-gray-900">{hireDialog?.jobPost?.jobTitle}</p>
            <p className="text-xs text-gray-500 mt-0.5">The agent will be notified: &quot;Congratulations, your application has been approved, and you&apos;ve been hired for the job.&quot;</p>
          </div>
          <div className="space-y-2">
            <Label>Salary ($/hr)</Label>
            <Input type="number" step="0.01" value={hireForm.salary} onChange={e => setHireForm(f => ({ ...f, salary: e.target.value }))} placeholder="6.50" />
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={hireForm.startDate} onChange={e => setHireForm(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Next Salary Date (optional)</Label>
            <Input type="date" value={hireForm.nextSalaryDate} onChange={e => setHireForm(f => ({ ...f, nextSalaryDate: e.target.value }))} />
          </div>
          <Button onClick={handleConfirmHire} disabled={actionLoading} className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
            {actionLoading ? 'Hiring...' : <><CheckCircle2 className="h-4 w-4 mr-2" />Confirm Hire</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
