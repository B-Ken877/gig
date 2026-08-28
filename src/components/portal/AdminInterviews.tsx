'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle, RefreshCw, CalendarDays, Clock, MapPin, MessageSquare,
  CheckCircle2, XCircle, Video, Mail, Briefcase, Globe, ChevronRight,
  User as UserIcon, Calendar, ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/lib/store';

interface InterviewAgent {
  id: string;
  name?: string;
  email?: string;
  avatar?: string | null;
  userId: string;
  country?: string | null;
  experience?: number | null;
}

interface InterviewJob {
  id: string;
  jobTitle: string;
  location?: string | null;
}

interface Interview {
  id: string;
  applicationId: string;
  agentId: string;
  jobPostId: string;
  scheduledAt: string;
  timezone?: string | null;
  location?: string | null;
  notes?: string | null;
  status: string;  // 'scheduled' | 'completed' | 'cancelled'
  conversationId?: string | null;
  createdAt: string;
  agent: InterviewAgent | null;
  jobPost: InterviewJob | null;
  applicationStatus?: string | null;
}

type StatusFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export default function AdminInterviews() {
  const { currentUser, addToast } = useAppStore();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming');
  const [detailsInterview, setDetailsInterview] = useState<Interview | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState<Interview | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<Interview | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const headers = currentUser
    ? { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin' }
    : {};

  const loadInterviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/interviews', { headers });
      if (!res.ok) throw new Error('Failed to load interviews');
      const data = await res.json();
      setInterviews(data.interviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInterviews(); /* eslint-disable-next-line */ }, []);

  // Filter + sort by upcoming vs past
  const filtered = useMemo(() => {
    const now = Date.now();
    let list = interviews;
    if (statusFilter === 'upcoming') {
      list = interviews.filter(i => i.status === 'scheduled' && new Date(i.scheduledAt).getTime() >= now - 60 * 60 * 1000);
    } else if (statusFilter === 'completed') {
      list = interviews.filter(i => i.status === 'completed');
    } else if (statusFilter === 'cancelled') {
      list = interviews.filter(i => i.status === 'cancelled');
    }
    // Sort: soonest first for upcoming, most recent first for others
    return [...list].sort((a, b) => {
      const at = new Date(a.scheduledAt).getTime();
      const bt = new Date(b.scheduledAt).getTime();
      return statusFilter === 'upcoming' ? at - bt : bt - at;
    });
  }, [interviews, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: interviews.filter(i => i.status === 'scheduled' && new Date(i.scheduledAt).getTime() >= now - 60 * 60 * 1000).length,
      completed: interviews.filter(i => i.status === 'completed').length,
      cancelled: interviews.filter(i => i.status === 'cancelled').length,
      pastDue: interviews.filter(i => i.status === 'scheduled' && new Date(i.scheduledAt).getTime() < now - 60 * 60 * 1000).length,
    };
  }, [interviews]);

  const handleMarkComplete = async (interview: Interview) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/interviews/${interview.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (res.ok) {
        addToast({ title: 'Interview marked as completed', description: 'The agent has been notified.', variant: 'success' });
        setCompleteConfirm(null);
        setDetailsInterview(null);
        loadInterviews();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Failed to update', description: data.error || 'Please try again', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (interview: Interview) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/interviews/${interview.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        addToast({ title: 'Interview cancelled', description: 'The agent has been notified.', variant: 'success' });
        setCancelConfirm(null);
        setDetailsInterview(null);
        loadInterviews();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Failed to cancel', description: data.error || 'Please try again', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatInterviewDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  };
  const formatInterviewTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };
  const formatRelative = (iso: string) => {
    const diffMs = new Date(iso).getTime() - Date.now();
    const diffH = Math.round(diffMs / (1000 * 60 * 60));
    const absH = Math.abs(diffH);
    if (absH < 1) return 'in less than an hour';
    if (absH < 24) return diffH > 0 ? `in ${absH} hour${absH !== 1 ? 's' : ''}` : `${absH} hour${absH !== 1 ? 's' : ' ago'}`;
    const diffD = Math.round(diffH / 24);
    return diffD > 0 ? `in ${diffD} day${diffD !== 1 ? 's' : ''}` : `${Math.abs(diffD)} day${Math.abs(diffD) !== 1 ? 's' : ' ago'}`;
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    scheduled: { label: 'Scheduled', color: 'text-blue-700', bg: 'bg-blue-100', icon: Calendar },
    completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  };

  const filterTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'upcoming', label: 'Upcoming', count: stats.upcoming },
    { value: 'completed', label: 'Completed', count: stats.completed },
    { value: 'cancelled', label: 'Cancelled', count: stats.cancelled },
    { value: 'all', label: 'All', count: interviews.length },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50"><CardContent className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-red-700 mb-1">Failed to load interviews</p>
        <p className="text-xs text-red-500 mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={loadInterviews}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Interviews</h2>
        <p className="text-sm text-gray-500">Schedule, manage, and track interviews with job applicants.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Calendar className="h-4 w-4 text-blue-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Upcoming</p>
              <p className="text-xl font-bold leading-tight text-blue-600">{stats.upcoming}</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Completed</p>
              <p className="text-xl font-bold leading-tight text-green-600">{stats.completed}</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><XCircle className="h-4 w-4 text-red-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Cancelled</p>
              <p className="text-xl font-bold leading-tight text-red-600">{stats.cancelled}</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0"><Clock className="h-4 w-4 text-amber-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Past Due</p>
              <p className="text-xl font-bold leading-tight text-amber-600">{stats.pastDue}</p>
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
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No {statusFilter === 'all' ? '' : statusFilter} interviews.</p>
          <p className="text-xs mt-1">
            {statusFilter === 'upcoming'
              ? 'When you schedule interviews from the Applications tab, they will appear here.'
              : 'Try switching tabs to see other interviews.'}
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(interview => {
            const sc = statusConfig[interview.status] || statusConfig.scheduled;
            const StatusIcon = sc.icon;
            const isUpcoming = interview.status === 'scheduled' && new Date(interview.scheduledAt).getTime() > Date.now() - 60 * 60 * 1000;
            const isPastDue = interview.status === 'scheduled' && new Date(interview.scheduledAt).getTime() < Date.now() - 60 * 60 * 1000;
            return (
              <Card key={interview.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  {/* Top row: agent + status */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 shrink-0">
                      {interview.agent?.avatar && <AvatarImage src={interview.agent.avatar} alt={interview.agent?.name || 'Agent'} />}
                      <AvatarFallback className="bg-[#16A34A] text-white text-xs font-bold">
                        {(interview.agent?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setDetailsInterview(interview)}
                          className="font-semibold text-gray-900 hover:text-[#16A34A] transition-colors text-left truncate"
                          title="View interview details"
                        >
                          {interview.agent?.name || 'Unknown Agent'}
                        </button>
                        <Badge variant="secondary" className={`text-[9px] uppercase tracking-wide ${sc.bg} ${sc.color}`}>
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />{sc.label}
                          {isPastDue && <span className="ml-1">· Past Due</span>}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500 flex-wrap">
                        <span className="inline-flex items-center gap-0.5 font-medium text-gray-700">
                          <Briefcase className="h-3 w-3" />{interview.jobPost?.jobTitle || 'Unknown Position'}
                        </span>
                        {interview.agent?.country && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{interview.agent.country}</span>}
                        {interview.agent?.experience != null && <span className="inline-flex items-center gap-0.5"><UserIcon className="h-3 w-3" />{interview.agent.experience} yr exp</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatInterviewDate(interview.scheduledAt).split(',')[0]}</p>
                      <p className="text-xs text-gray-500">{formatInterviewTime(interview.scheduledAt)}</p>
                      {isUpcoming && (
                        <p className="text-[10px] text-[#16A34A] font-medium mt-0.5">{formatRelative(interview.scheduledAt)}</p>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    {interview.status === 'scheduled' && (
                      <>
                        <Button size="sm" className="flex-1 h-9 bg-[#16A34A] text-white hover:bg-[#16A34A]/90 text-xs" onClick={() => setCompleteConfirm(interview)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">Mark Completed</span>
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-9 text-red-600 border-red-300 hover:bg-red-50 text-xs" onClick={() => setCancelConfirm(interview)}>
                          <XCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">Cancel Interview</span>
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="h-9 text-gray-700 hover:bg-gray-100 text-xs" onClick={() => setDetailsInterview(interview)}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Shared dialogs (always rendered so buttons work) ─── */}
      {/* Details Modal */}
      {detailsInterview && (
        <Dialog open={!!detailsInterview} onOpenChange={(o) => { if (!o) setDetailsInterview(null); }}>
          <DialogContent className="sm:max-w-lg z-[200]">
            <DialogHeader>
              <DialogTitle>Interview Details</DialogTitle>
              <DialogDescription>
                Full details for the scheduled interview.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Agent + Job */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  {detailsInterview.agent?.avatar && <AvatarImage src={detailsInterview.agent.avatar} alt={detailsInterview.agent?.name || 'Agent'} />}
                  <AvatarFallback className="bg-[#16A34A] text-white text-sm font-bold">
                    {(detailsInterview.agent?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{detailsInterview.agent?.name || 'Unknown Agent'}</h3>
                  {detailsInterview.agent?.email && (
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" />{detailsInterview.agent.email}</p>
                  )}
                  {detailsInterview.jobPost && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Briefcase className="h-3 w-3" />{detailsInterview.jobPost.jobTitle}</p>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-[10px] text-blue-700 uppercase tracking-wider font-medium flex items-center gap-1"><Calendar className="h-3 w-3" />Date</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{formatInterviewDate(detailsInterview.scheduledAt)}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-[10px] text-blue-700 uppercase tracking-wider font-medium flex items-center gap-1"><Clock className="h-3 w-3" />Time</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{formatInterviewTime(detailsInterview.scheduledAt)}</p>
                </div>
              </div>

              {/* Timezone */}
              {detailsInterview.timezone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Globe className="h-3.5 w-3.5 text-gray-400" />
                  <span>Timezone: <strong>{detailsInterview.timezone}</strong></span>
                </div>
              )}

              {/* Location / Meeting Link */}
              {detailsInterview.location && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-500" />Location / Meeting Link</h4>
                  <div className="p-2 rounded-md bg-gray-50 border text-xs">
                    {detailsInterview.location.startsWith('http') ? (
                      <a href={detailsInterview.location} target="_blank" rel="noopener noreferrer" className="text-[#16A34A] hover:underline break-all inline-flex items-center gap-1">
                        {detailsInterview.location} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-gray-700 break-words">{detailsInterview.location}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {detailsInterview.notes && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-gray-500" />Notes</h4>
                  <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 whitespace-pre-wrap">{detailsInterview.notes}</div>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Status:</span>
                {(() => {
                  const sc = statusConfig[detailsInterview.status] || statusConfig.scheduled;
                  const StatusIcon = sc.icon;
                  return (
                    <Badge variant="secondary" className={`text-[10px] uppercase tracking-wide ${sc.bg} ${sc.color}`}>
                      <StatusIcon className="h-2.5 w-2.5 mr-0.5" />{sc.label}
                    </Badge>
                  );
                })()}
              </div>

              {/* Action buttons in modal */}
              {detailsInterview.status === 'scheduled' && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" className="flex-1 bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => setCompleteConfirm(detailsInterview)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Mark Completed
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50" onClick={() => setCancelConfirm(detailsInterview)}>
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />Cancel
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setDetailsInterview(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Mark Completed Confirmation */}
      <AlertDialog open={!!completeConfirm} onOpenChange={(o) => { if (!o) setCompleteConfirm(null); }}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this interview as completed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the interview with {completeConfirm?.agent?.name || 'this agent'} as completed. The agent will receive a notification thanking them for attending and telling them you'll be in touch soon. You can still hire or reject them from the Applications tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
              onClick={() => completeConfirm && handleMarkComplete(completeConfirm)}
              disabled={actionLoading}
            >
              {actionLoading ? 'Updating...' : 'Yes, Mark Completed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelConfirm} onOpenChange={(o) => { if (!o) setCancelConfirm(null); }}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this interview?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the interview with {cancelConfirm?.agent?.name || 'this agent'} for {cancelConfirm?.jobPost?.jobTitle || 'this position'}. The agent will be notified that the interview has been cancelled. This action cannot be undone — you would need to reschedule a new interview from the Applications tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Interview</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => cancelConfirm && handleCancel(cancelConfirm)}
              disabled={actionLoading}
            >
              {actionLoading ? 'Cancelling...' : 'Yes, Cancel Interview'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
