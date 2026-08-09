'use client';
import { useState, useEffect } from 'react';
import {
  Briefcase, Users, ClipboardList, DollarSign, ArrowRight, TrendingUp,
  AlertCircle, RefreshCw, CheckCircle2, Clock, Network, CalendarClock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

interface Stats {
  totalJobs: number;
  activeJobs: number;
  totalAgents: number;
  activeAgents: number;
  pendingApplications: number;
  totalApplications: number;
  activePlacements: number;
  totalProviders: number;
}

export default function AdminDashboard() {
  const { currentUser, navigateTo } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const headers = { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role };

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [jobsRes, agentsRes, appsRes, placementsRes, providersRes] = await Promise.all([
          fetch('/api/job-posts?all=1', { headers }).then(r => r.json()),
          fetch('/api/agents', { headers }).then(r => r.json()),
          fetch('/api/job-applications', { headers }).then(r => r.json()),
          fetch('/api/placements', { headers }).then(r => r.json()),
          fetch('/api/providers', { headers }).then(r => r.json()),
        ]);

        const jobs = jobsRes.jobPosts || [];
        const agents = agentsRes.agents || (agentsRes.id ? [agentsRes] : []);
        const apps = appsRes.applications || [];
        const placements = placementsRes.placements || [];
        const providers = providersRes.providers || [];

        setStats({
          totalJobs: jobs.length,
          activeJobs: jobs.filter((j: any) => j.isActive).length,
          totalAgents: agents.length,
          activeAgents: agents.filter((a: any) => a.status === 'Available').length,
          pendingApplications: apps.filter((a: any) => a.status === 'applied').length,
          totalApplications: apps.length,
          activePlacements: placements.filter((p: any) => p.status === 'active').length,
          totalProviders: providers.length,
        });
        setRecentApps(apps.slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load dashboard</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const cards = [
    { label: 'Active Jobs', value: stats?.activeJobs ?? 0, total: stats?.totalJobs, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', page: 'admin-job-posts' as const },
    { label: 'Pending Applications', value: stats?.pendingApplications ?? 0, total: stats?.totalApplications, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50', page: 'admin-placements' as const },
    { label: 'Active Placements', value: stats?.activePlacements ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', page: 'admin-placements' as const },
    { label: 'Active Agents', value: stats?.activeAgents ?? 0, total: stats?.totalAgents, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', page: 'admin-users' as const },
  ];

  const actions = [
    { label: 'Post a Job', desc: 'Create a new job posting', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', page: 'admin-job-posts' as const },
    { label: 'Add Provider', desc: 'Record who gave us a job', icon: Network, color: 'text-purple-600', bg: 'bg-purple-50', page: 'admin-providers' as const },
    { label: 'Review Applications', desc: 'Hire or reject applicants', icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50', page: 'admin-placements' as const },
    { label: 'Add Pay Date', desc: 'Schedule upcoming paydays', icon: CalendarClock, color: 'text-green-600', bg: 'bg-green-50', page: 'admin-salary-dates' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-[#0B1A2E] via-[#0f2540] to-[#16325a] px-6 py-5 text-white relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#16A34A]/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="relative flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-[#16A34A]/40 shadow-xl">
                  {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser?.name || 'User'} />}
                  <AvatarFallback className="bg-[#16A34A] text-white text-lg font-bold">
                    {(currentUser?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 bg-[#16A34A] rounded-full p-1 ring-2 ring-white">
                  <ShieldCheck className="h-3.5 w-3.5 text-white" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{currentUser?.name?.split(' ')[0]}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/20 text-[#4ADE80] text-[10px] font-semibold uppercase tracking-wide">Admin</span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5">Platform Overview · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(c.page)}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className={`h-9 w-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${c.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500">{c.label}</p>
                  <p className="text-lg font-bold leading-tight">
                    {c.value}
                    {c.total != null && c.total !== c.value && (
                      <span className="text-xs text-gray-400 font-normal"> / {c.total}</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <Card key={a.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(a.page)}>
                <CardContent className="p-3 flex flex-col items-center text-center">
                  <div className={`h-10 w-10 rounded-lg ${a.bg} flex items-center justify-center mb-2`}>
                    <Icon className={`h-5 w-5 ${a.color}`} />
                  </div>
                  <h3 className="text-xs font-semibold">{a.label}</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">{a.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent applications */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#16A34A]" />
              <h3 className="text-sm font-semibold">Recent Applications</h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigateTo('admin-placements' as never)}>
              View All <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
          {recentApps.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No applications yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentApps.map(app => (
                <div key={app.id} className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-sm transition-shadow">
                  <div className="h-8 w-8 rounded-full bg-[#16A34A]/10 flex items-center justify-center text-xs font-bold text-[#16A34A]">
                    {(app.agent?.name || 'A').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{app.agent?.name || 'Agent'}</p>
                    <p className="text-xs text-gray-500">{app.jobPost?.jobTitle || 'Job'} · {new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] uppercase ${
                    app.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                    app.status === 'reviewed' ? 'bg-amber-100 text-amber-700' :
                    app.status === 'hired' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>{app.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
