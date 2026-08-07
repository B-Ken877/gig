'use client';
import { useState, useEffect } from 'react';
import {
  AlertCircle, RefreshCw, Briefcase, ClipboardList, CheckCircle2, XCircle,
  DollarSign, Calendar, MapPin, User, Building2, Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import type { JobApplication, Placement } from '@/lib/types';

const APP_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  applied: { label: 'Applied', color: 'text-blue-700', bg: 'bg-blue-100' },
  reviewed: { label: 'Reviewed', color: 'text-amber-700', bg: 'bg-amber-100' },
  hired: { label: 'Hired', color: 'text-green-700', bg: 'bg-green-100' },
  rejected: { label: 'Not Selected', color: 'text-red-700', bg: 'bg-red-100' },
};

export default function AdminPlacements() {
  const { currentUser, addToast } = useAppStore();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hireDialog, setHireDialog] = useState<JobApplication | null>(null);
  const [hireForm, setHireForm] = useState({ salary: '', startDate: '', nextSalaryDate: '' });

  const headers = currentUser
    ? { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin', 'Content-Type': 'application/json' }
    : {};

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsRes, placementsRes] = await Promise.all([
        fetch('/api/job-applications', { headers }).then(r => r.json()),
        fetch('/api/placements', { headers }).then(r => r.json()),
      ]);
      setApplications(appsRes.applications || []);
      setPlacements(placementsRes.placements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleUpdateStatus = async (app: JobApplication, status: 'reviewed' | 'hired' | 'rejected') => {
    if (status === 'hired') {
      setHireForm({
        salary: app.jobPost?.hourlyRate ? String(app.jobPost.hourlyRate) : '',
        startDate: new Date().toISOString().split('T')[0],
        nextSalaryDate: '',
      });
      setHireDialog(app);
      return;
    }
    try {
      const res = await fetch(`/api/job-applications/${app.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ status }),
      });
      if (res.ok) {
        addToast({ title: `Application ${status}`, variant: 'success' });
        load();
      } else {
        addToast({ title: 'Failed to update', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    }
  };

  const handleConfirmHire = async () => {
    if (!hireDialog) return;
    try {
      const res = await fetch(`/api/job-applications/${hireDialog.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({
          status: 'hired',
          salary: hireForm.salary,
          startDate: hireForm.startDate,
          nextSalaryDate: hireForm.nextSalaryDate || undefined,
        }),
      });
      if (res.ok) {
        addToast({ title: 'Agent hired!', description: 'A placement has been created and the agent notified.', variant: 'success' });
        setHireDialog(null);
        load();
      } else {
        addToast({ title: 'Failed to hire', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  const pendingApps = applications.filter(a => a.status === 'applied');
  const reviewedApps = applications.filter(a => a.status === 'reviewed');
  const hiredApps = applications.filter(a => a.status === 'hired');
  const rejectedApps = applications.filter(a => a.status === 'rejected');
  const activePlacements = placements.filter(p => p.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Applications & Placements</h2>
        <p className="text-sm text-gray-500">Review applications, hire agents, and manage active placements.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{pendingApps.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Reviewed</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{reviewedApps.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Hired</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{hiredApps.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Active Placements</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">{activePlacements.length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="placements">Placements ({placements.length})</TabsTrigger>
        </TabsList>

        {/* Applications tab */}
        <TabsContent value="applications" className="space-y-3 mt-4">
          {applications.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No applications yet.</p>
            </CardContent></Card>
          ) : (
            applications.map(app => {
              const status = APP_STATUS[app.status] || APP_STATUS.applied;
              return (
                <Card key={app.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{app.jobPost?.jobTitle || 'Job'}</h3>
                          <Badge variant="secondary" className={`text-[10px] uppercase ${status.bg} ${status.color}`}>{status.label}</Badge>
                          {app.assessmentPassed && (
                            <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">Assessment {app.assessmentScore?.toFixed(0)}%</Badge>
                          )}
                        </div>
                        {app.agent && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <User className="h-3 w-3" />
                            <span className="font-medium text-gray-700">{app.agent.name}</span>
                            {app.agent.country && <span>· {app.agent.country}</span>}
                            {app.agent.experience != null && <span>· {app.agent.experience} yr exp</span>}
                          </div>
                        )}
                        {app.jobPost && (
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{app.jobPost.location || 'Remote'}</span>
                            {app.jobPost.hourlyRate > 0 && <span className="flex items-center gap-1 text-[#16A34A] font-semibold"><DollarSign className="h-3 w-3" />${app.jobPost.hourlyRate.toFixed(2)}/{app.jobPost.payFrequency === 'hourly' ? 'hr' : 'period'}</span>}
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        {app.coverMessage && <p className="text-xs text-gray-600 mt-2 italic line-clamp-2">{app.coverMessage}</p>}
                      </div>

                      {app.status === 'applied' && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(app, 'reviewed')}>Review</Button>
                          <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => handleUpdateStatus(app, 'hired')}>Hire</Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleUpdateStatus(app, 'rejected')}><XCircle className="h-4 w-4" /></Button>
                        </div>
                      )}
                      {app.status === 'reviewed' && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => handleUpdateStatus(app, 'hired')}>Hire</Button>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleUpdateStatus(app, 'rejected')}><XCircle className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Placements tab */}
        <TabsContent value="placements" className="space-y-3 mt-4">
          {placements.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">
              <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No placements yet. Hire an agent from the Applications tab.</p>
            </CardContent></Card>
          ) : (
            placements.map(p => (
              <Card key={p.id} className={p.status !== 'active' ? 'opacity-75' : ''}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{p.position}</h3>
                        <Badge variant="secondary" className={`text-[10px] uppercase ${
                          p.status === 'active' ? 'bg-green-100 text-green-700' :
                          p.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{p.status}</Badge>
                      </div>
                      {p.agent && (
                        <div className="flex items-center gap-2 text-xs text-gray-700 mt-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">{p.agent.name}</span>
                          {p.agent.email && <span className="text-gray-500">· {p.agent.email}</span>}
                        </div>
                      )}
                      {p.jobPost && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.jobPost.location || 'Remote'}</span>
                          {p.salary != null && <span className="flex items-center gap-1 text-[#16A34A] font-semibold"><DollarSign className="h-3 w-3" />${p.salary.toFixed(2)}</span>}
                          {p.startDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Started {new Date(p.startDate).toLocaleDateString()}</span>}
                          {p.nextSalaryDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Next payday: {new Date(p.nextSalaryDate).toLocaleDateString()}</span>}
                        </div>
                      )}
                      {p.notes && <p className="text-xs text-gray-500 mt-2 italic">{p.notes}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Hire dialog */}
      <Dialog open={!!hireDialog} onOpenChange={(o) => { if (!o) setHireDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hire {hireDialog?.agent?.name || 'Agent'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-sm font-medium text-gray-900">{hireDialog?.jobPost?.jobTitle}</p>
              <p className="text-xs text-gray-500 mt-0.5">Confirm the placement details below. The agent will be notified.</p>
            </div>
            <div className="space-y-2">
              <Label>Salary ($)</Label>
              <Input type="number" step="0.01" value={hireForm.salary} onChange={e => setHireForm(f => ({ ...f, salary: e.target.value }))} placeholder="15.00" />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={hireForm.startDate} onChange={e => setHireForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Next Salary Date (optional)</Label>
              <Input type="date" value={hireForm.nextSalaryDate} onChange={e => setHireForm(f => ({ ...f, nextSalaryDate: e.target.value }))} />
            </div>
            <Button onClick={handleConfirmHire} className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
              <CheckCircle2 className="h-4 w-4 mr-2" />Confirm Hire
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
