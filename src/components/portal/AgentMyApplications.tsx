'use client';
import { useState, useEffect } from 'react';
import {
  ClipboardList, AlertCircle, RefreshCw, MapPin, Clock, DollarSign,
  CheckCircle2, XCircle, Eye, ArrowRight, Video, Calendar, CalendarClock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import type { JobApplication } from '@/lib/types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  applied: { label: 'Under Review', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  interview_scheduled: { label: 'Interview Scheduled', color: 'text-amber-700', bg: 'bg-amber-100', icon: CalendarClock },
  hired: { label: 'Hired', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  rejected: { label: 'Not Selected', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

const PAY_FREQ_TEXT: Record<string, string> = {
  'hourly': 'Paid hourly', 'weekly': 'Paid weekly',
  'bi-weekly': 'Paid bi-weekly', 'monthly': 'Paid monthly',
};

export default function AgentMyApplications() {
  const { currentUser, navigateTo } = useAppStore();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const headers = { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role };

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const agentRes = await fetch('/api/agents?userId=' + currentUser.id, { headers });
        const agentData = await agentRes.json();
        const me = agentData.id ? agentData : (agentData.agents || []).find((a: any) => a.userId === currentUser.id);
        if (!me) { setLoading(false); return; }
        const appsRes = await fetch('/api/job-applications?agentId=' + me.id, { headers });
        const appsData = await appsRes.json();
        setApplications(appsData.applications || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50"><CardContent className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-red-700 mb-1">Failed to load applications</p>
        <p className="text-xs text-red-500 mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Applications</h2>
          <p className="text-sm text-gray-500 mt-1">{applications.length} application{applications.length !== 1 ? 's' : ''} submitted</p>
        </div>
        <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => navigateTo('agent-dashboard' as never)}>
          Browse More Jobs <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>

      {applications.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">No applications yet</p>
          <p className="text-xs text-gray-500 mb-4">Apply for jobs from your dashboard to see them here.</p>
          <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => navigateTo('agent-dashboard' as never)}>
            Browse Jobs
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {applications.map(app => {
            const status = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;
            const StatusIcon = status.icon;
            return (
              <Card key={app.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900">{app.jobPost?.jobTitle || 'Job Post'}</h3>
                        <Badge variant="secondary" className={`text-[10px] uppercase ${status.bg} ${status.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />{status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                        {app.jobPost?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{app.jobPost.location}</span>}
                        {app.jobPost?.hourlyRate != null && app.jobPost.hourlyRate > 0 && (
                          <span className="flex items-center gap-1 text-[#16A34A] font-semibold"><DollarSign className="h-3 w-3" />{app.jobPost.hourlyRate.toFixed(2)}/hr</span>
                        )}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{PAY_FREQ_TEXT[app.jobPost?.payFrequency || 'bi-weekly'] || 'Paid bi-weekly'}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                      </div>
                      {(app.videoCount || 0) > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-medium">
                          <Video className="h-3 w-3" />{app.videoCount} video response{app.videoCount !== 1 ? 's' : ''} submitted
                        </div>
                      )}
                      {status.label === 'Interview Scheduled' && (
                        <div className="mt-3 flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
                          <CalendarClock className="h-4 w-4 text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-800 flex-1">
                            An interview has been scheduled for this application. Check your messages for the full details (date, time, location).
                          </p>
                          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 h-7 text-xs" onClick={() => navigateTo('messages')}>
                            View Message <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      )}
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
