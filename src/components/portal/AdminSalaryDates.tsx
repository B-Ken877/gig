'use client';
import { useState, useEffect } from 'react';
import {
  AlertCircle, RefreshCw, CalendarClock, Plus, Trash2, Calendar, Briefcase, ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import type { SalaryDate, JobPost } from '@/lib/types';

const FREQUENCIES = ['weekly', 'bi-weekly', 'monthly'];

export default function AdminSalaryDates() {
  const { currentUser, addToast } = useAppStore();
  const [dates, setDates] = useState<SalaryDate[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ jobPostId: '', payDate: '', frequency: 'bi-weekly', description: '' });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = currentUser
    ? { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin', 'Content-Type': 'application/json' }
    : {};

  const load = async () => {
    setPageLoading(true);
    setError(null);
    try {
      const [datesRes, jobsRes] = await Promise.all([
        fetch('/api/salary-dates', { headers }),
        fetch('/api/job-posts?all=1', { headers }),
      ]);
      const datesData = await datesRes.json();
      const jobsData = await jobsRes.json();
      setDates(datesData.salaryDates || []);
      // Only show jobs that have at least one active placement (i.e., agents hired).
      const jobsWithPlacements = (jobsData.jobPosts || []).filter((j: JobPost) => (j._count?.placements || 0) > 0);
      setJobs(jobsWithPlacements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleSave = async () => {
    if (!form.jobPostId) {
      addToast({ title: 'Job required', description: 'Please select a job (project) for this pay date.', variant: 'destructive' });
      return;
    }
    if (!form.payDate) {
      addToast({ title: 'Pay date required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/salary-dates', {
        method: 'POST', headers, body: JSON.stringify(form),
      });
      if (res.ok) {
        addToast({ title: 'Pay date added', variant: 'success' });
        setOpen(false);
        setForm({ jobPostId: '', payDate: '', frequency: 'bi-weekly', description: '' });
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Failed to save', description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pay date?')) return;
    try {
      const res = await fetch(`/api/salary-dates/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        addToast({ title: 'Deleted', variant: 'success' });
        load();
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    }
  };

  if (pageLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50"><CardContent className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
      </CardContent></Card>
    );
  }

  const now = new Date();
  const upcoming = dates.filter(d => new Date(d.payDate) >= now);
  const past = dates.filter(d => new Date(d.payDate) < now);

  // Group upcoming by job
  const byJob: Record<string, { jobTitle: string; dates: SalaryDate[] }> = {};
  for (const d of upcoming) {
    const key = d.jobPostId;
    if (!byJob[key]) byJob[key] = { jobTitle: (d as any).jobTitle || 'Unknown Job', dates: [] };
    byJob[key].dates.push(d);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Salary Dates</h2>
          <p className="text-sm text-gray-500">Set pay dates per job. Agents only see pay dates for jobs they&apos;re hired on.</p>
        </div>
        <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => setOpen(true)} disabled={jobs.length === 0}>
          <Plus className="h-4 w-4 mr-2" />Add Pay Date
        </Button>
      </div>

      {jobs.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm text-amber-800 font-medium">No jobs with hired agents yet</p>
              <p className="text-xs text-amber-700">You can only add pay dates for jobs that have at least one hired agent. Hire an agent first from the Applications tab.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming pay dates grouped by job */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-5 w-5 text-[#16A34A]" />
            <h3 className="text-sm font-semibold">Upcoming Pay Dates</h3>
            <Badge variant="secondary" className="text-xs">{upcoming.length}</Badge>
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CalendarClock className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No upcoming pay dates scheduled.</p>
              {jobs.length > 0 && <p className="text-xs mt-1">Click &quot;Add Pay Date&quot; to schedule one.</p>}
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(byJob).map(([jobId, group]) => (
                <div key={jobId}>
                  <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    <h4 className="text-sm font-semibold text-gray-700">{group.jobTitle}</h4>
                    <Badge variant="outline" className="text-[10px]">{group.dates.length} date{group.dates.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  <div className="space-y-2 ml-6">
                    {group.dates.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-sm transition-shadow bg-white">
                        <div className="h-12 w-12 rounded-lg bg-[#16A34A]/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-[#16A34A] uppercase">{new Date(d.payDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="text-base font-bold text-[#16A34A]">{new Date(d.payDate).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(d.payDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">{d.frequency}</Badge>
                            {d.description && <span className="text-xs text-gray-500 truncate">{d.description}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-600">Past Pay Dates</h3>
              <Badge variant="secondary" className="text-xs">{past.length}</Badge>
            </div>
            <div className="space-y-1">
              {past.slice(0, 15).map(d => (
                <div key={d.id} className="flex items-center gap-3 p-2 text-xs text-gray-500 opacity-75 hover:bg-gray-50 rounded">
                  <span className="font-medium">{new Date(d.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="text-gray-400">·</span>
                  <span className="truncate">{(d as any).jobTitle || 'Unknown Job'}</span>
                  <Badge variant="outline" className="text-[10px]">{d.frequency}</Badge>
                  {d.description && <span className="truncate flex-1">{d.description}</span>}
                  <button onClick={() => handleDelete(d.id)} className="ml-auto text-gray-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Pay Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job (Project) *</Label>
              <Select value={form.jobPostId} onValueChange={v => setForm(f => ({ ...f, jobPostId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a job with hired agents" /></SelectTrigger>
                <SelectContent>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.jobTitle} ({j._count?.placements || 0} agent{j._count?.placements !== 1 ? 's' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Only jobs with at least one hired agent appear here. Agents hired on this job will see this pay date.</p>
            </div>
            <div className="space-y-2">
              <Label>Pay Date *</Label>
              <Input type="date" value={form.payDate} onChange={e => setForm(f => ({ ...f, payDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="e.g. December 2024 pay cycle" />
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
              {loading ? 'Saving...' : 'Add Pay Date'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
