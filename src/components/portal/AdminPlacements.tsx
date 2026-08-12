'use client';
import { useState, useEffect } from 'react';
import {
  AlertCircle, RefreshCw, Briefcase, ClipboardList, CheckCircle2, XCircle,
  DollarSign, Calendar, MapPin, User, Clock, ChevronRight, Video, ArrowLeft,
  Play, Mail, CalendarClock, MessageSquare,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
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
  // Confirmation dialogs (so admin doesn't accidentally hire/reject)
  const [hireConfirmApp, setHireConfirmApp] = useState<JobApplication | null>(null);
  const [rejectConfirmApp, setRejectConfirmApp] = useState<JobApplication | null>(null);
  // Schedule-interview modal
  const [scheduleApp, setScheduleApp] = useState<JobApplication | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [scheduleTimezone, setScheduleTimezone] = useState('America/Port-au-Prince');
  const [scheduleLocation, setScheduleLocation] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

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
    // Open the confirmation dialog first — user must explicitly confirm.
    setHireConfirmApp(app);
  };

  const handleConfirmHireConfirmed = (app: JobApplication) => {
    // User confirmed in the AlertDialog. Now open the hire form dialog.
    setHireForm({
      salary: app.jobPost?.hourlyRate ? String(app.jobPost.hourlyRate) : '',
      startDate: new Date().toISOString().split('T')[0],
      nextSalaryDate: '',
    });
    setHireDialog(app);
    setHireConfirmApp(null);
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

  const handleReject = (app: JobApplication) => {
    // Open the confirmation dialog first.
    setRejectConfirmApp(app);
  };

  const handleConfirmRejectConfirmed = async (app: JobApplication) => {
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
      } else {
        addToast({ title: 'Failed to reject', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setRejectConfirmApp(null);
    }
  };

  // ─── Schedule Interview ──────────────────────────────────────────────────
  const openScheduleModal = (app: JobApplication) => {
    setScheduleApp(app);
    // Default: tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setScheduleDate(tomorrow);
    setScheduleTime('10:00');
    setScheduleTimezone('America/Port-au-Prince');
    setScheduleLocation('');
    setScheduleNotes('');
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleApp || !scheduleDate) return;
    // Combine the picked date with the picked time
    const when = new Date(scheduleDate);
    const [hours, minutes] = scheduleTime.split(':').map(n => parseInt(n, 10));
    if (!isNaN(hours) && !isNaN(minutes)) {
      when.setHours(hours, minutes, 0, 0);
    }
    if (when.getTime() < Date.now()) {
      addToast({ title: 'Invalid time', description: 'Please pick a future date and time.', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: scheduleApp.id,
          scheduledAt: when.toISOString(),
          timezone: scheduleTimezone,
          location: scheduleLocation || undefined,
          notes: scheduleNotes || undefined,
        }),
      });
      if (res.ok) {
        addToast({
          title: 'Interview Scheduled!',
          description: 'An automated message has been sent to the agent with the interview details.',
          variant: 'success',
        });
        setScheduleApp(null);
        if (selectedJob) loadApplicants(selectedJob.id);
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Failed to schedule', description: data.error || 'Please try again', variant: 'destructive' });
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

  // ─── Shared dialogs (rendered in every view so the buttons work) ────────
  // These must be mounted in the React tree at all times so that when an
  // admin clicks "Schedule Interview" / "Hire" / "Reject" on the applicants
  // list, the corresponding dialog actually appears.
  const dialogs = (
    <>
      <Dialog open={!!hireDialog} onOpenChange={(o) => { if (!o) setHireDialog(null); }}>
        <DialogContent className="max-w-md z-[200]">
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

      {/* ─── Hire Confirmation Dialog ─── */}
      <AlertDialog open={!!hireConfirmApp} onOpenChange={(o) => { if (!o) setHireConfirmApp(null); }}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Hire {hireConfirmApp?.agent?.name || 'this agent'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the application as hired, create a placement, and notify the agent immediately.
              The agent will see this as a final decision — please make sure you&apos;ve reviewed the assessment videos.
              You can still reverse this later, but the agent will already have received a notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
              onClick={() => hireConfirmApp && handleConfirmHireConfirmed(hireConfirmApp)}
            >
              Yes, Hire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Reject Confirmation Dialog ─── */}
      <AlertDialog open={!!rejectConfirmApp} onOpenChange={(o) => { if (!o) setRejectConfirmApp(null); }}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {rejectConfirmApp?.agent?.name || 'this application'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the application as rejected and notify the agent. The agent will no longer be
              considered for this position. Are you sure you want to do this?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => rejectConfirmApp && handleConfirmRejectConfirmed(rejectConfirmApp)}
              disabled={actionLoading}
            >
              {actionLoading ? 'Rejecting...' : 'Yes, Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Schedule Interview Modal ─── */}
      <Dialog open={!!scheduleApp} onOpenChange={(o) => { if (!o) setScheduleApp(null); }}>
        <DialogContent className="sm:max-w-md z-[200]">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Pick a date and time to interview {scheduleApp?.agent?.name || 'this agent'} for {scheduleApp?.jobPost?.jobTitle || 'the position'}. An automated message with the details will be sent to the agent, and they will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Date picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date</Label>
              <div className="rounded-lg border flex justify-center p-2">
                <CalendarPicker
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </div>
            </div>

            {/* Time picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Time</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
              />
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Timezone</Label>
              <Input
                type="text"
                value={scheduleTimezone}
                onChange={e => setScheduleTimezone(e.target.value)}
                placeholder="America/Port-au-Prince"
              />
              <p className="text-xs text-gray-500">This is shown to the agent as a hint for their local time.</p>
            </div>

            {/* Location (optional) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Location / Meeting Link (optional)</Label>
              <Input
                type="text"
                value={scheduleLocation}
                onChange={e => setScheduleLocation(e.target.value)}
                placeholder="Zoom link, Google Meet, office address, etc."
              />
            </div>

            {/* Notes (optional) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes (optional)</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={3}
                value={scheduleNotes}
                onChange={e => setScheduleNotes(e.target.value)}
                placeholder="Anything specific you want the agent to prepare for the interview..."
              />
            </div>

            {/* Preview of the message that will be sent */}
            {scheduleDate && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />Message preview (sent to agent):
                </p>
                <p className="text-xs text-blue-800 whitespace-pre-wrap">
                  Congratulations! After reviewing your application for &quot;{scheduleApp?.jobPost?.jobTitle || 'the position'}&quot;, we would like to schedule an interview with you.
                  {'\n\n'}📅 {scheduleDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {scheduleTime}
                  {scheduleTimezone ? ` (${scheduleTimezone})` : ''}
                  {scheduleLocation && `\n📍 ${scheduleLocation}`}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setScheduleApp(null)}>Cancel</Button>
            <Button
              className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
              onClick={handleConfirmSchedule}
              disabled={actionLoading || !scheduleDate}
            >
              {actionLoading ? 'Scheduling...' : <><CalendarClock className="h-4 w-4 mr-2" />Confirm Interview</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  // ─── VIEW: JOBS LIST ─────────────────────────────────────────────────────
  if (view === 'jobs') {
    const jobsWithApps = jobs.filter(j => (j._count?.applications || 0) > 0);
    return (
      <>
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
      {dialogs}
      </>
    );
  }

  // ─── VIEW: APPLICANTS LIST ───────────────────────────────────────────────
  if (view === 'applicants' && selectedJob) {
    return (
      <>
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
              const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
                applied: { label: 'Pending Review', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
                interview_scheduled: { label: 'Interview Scheduled', color: 'text-amber-700', bg: 'bg-amber-100', icon: CalendarClock },
                hired: { label: 'Hired', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
                rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
              };
              const sc = statusConfig[status] || statusConfig.applied;
              const StatusIcon = sc.icon;
              return (
                <Card key={app.id} className="hover:shadow-md transition-shadow overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    {/* Top row: avatar + name + status badge */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleApplicantClick(app); }}
                        className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40 cursor-pointer"
                        title="View videos and details"
                      >
                        <Avatar className="h-11 w-11">
                          {app.agent?.avatar && <AvatarImage src={app.agent.avatar} alt={app.agent?.name || 'Agent'} />}
                          <AvatarFallback className="bg-[#16A34A] text-white text-xs font-bold">
                            {(app.agent?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleApplicantClick(app); }}
                            className="font-semibold text-gray-900 hover:text-[#16A34A] transition-colors text-left truncate"
                            title="View videos and details"
                          >
                            {app.agent?.name || 'Agent'}
                          </button>
                          <Badge variant="secondary" className={`text-[9px] uppercase tracking-wide ${sc.bg} ${sc.color}`}>
                            <StatusIcon className="h-2.5 w-2.5 mr-0.5" />{sc.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500 flex-wrap">
                          {app.agent?.country && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{app.agent.country}</span>}
                          {app.agent?.experience != null && <span className="inline-flex items-center gap-0.5"><Briefcase className="h-3 w-3" />{app.agent.experience} yr exp</span>}
                          <span className="inline-flex items-center gap-0.5"><Video className="h-3 w-3" />{app.videoCount || 0} videos</span>
                          <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />{new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons row — separate, full-width, well-spaced */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                      {(status === 'applied' || status === 'interview_scheduled') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 border-amber-300 text-amber-700 hover:bg-amber-50 text-xs"
                            onClick={() => openScheduleModal(app)}
                          >
                            <CalendarClock className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                            <span className="truncate">{status === 'interview_scheduled' ? 'Reschedule' : 'Schedule Interview'}</span>
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 h-9 bg-[#16A34A] text-white hover:bg-[#16A34A]/90 text-xs"
                            onClick={() => handleHireClick(app)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                            <span className="truncate">Hire</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-red-600 border-red-300 hover:bg-red-50 text-xs"
                            onClick={() => handleReject(app)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                            <span className="truncate">Reject</span>
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 text-gray-700 hover:bg-gray-100 text-xs"
                        onClick={() => handleApplicantClick(app)}
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" />View Videos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      {dialogs}
      </>
    );
  }

  // ─── VIEW: VIDEO RECORDINGS ──────────────────────────────────────────────
  if (view === 'recordings' && selectedApp && selectedJob) {
    const videos = selectedApp.videoResponses || [];
    const status = selectedApp.status;
    return (
      <>
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
                  <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => openScheduleModal(selectedApp)} disabled={actionLoading}>
                    <CalendarClock className="h-4 w-4 mr-2" />Schedule Interview
                  </Button>
                  <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => handleHireClick(selectedApp)} disabled={actionLoading}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />Hire Agent
                  </Button>
                  <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleReject(selectedApp)} disabled={actionLoading}>
                    <XCircle className="h-4 w-4 mr-2" />Reject
                  </Button>
                </div>
              )}
              {status === 'interview_scheduled' && (
                <div className="flex flex-col gap-2 shrink-0">
                  <Badge className="bg-amber-100 text-amber-700 text-xs uppercase">Interview Scheduled</Badge>
                  <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => openScheduleModal(selectedApp)} disabled={actionLoading}>
                    <CalendarClock className="h-4 w-4 mr-2" />Reschedule Interview
                  </Button>
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
      {dialogs}
      </>
    );
  }
}
