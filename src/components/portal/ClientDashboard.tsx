'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Building2, Users, Briefcase, MessageCircle, DollarSign, ArrowRight, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore, authFetch } from '@/lib/store';

const POLL_INTERVAL = 15000;

export default function ClientDashboard() {
  const { currentUser, navigateTo } = useAppStore();
  const [stats, setStats] = useState({ agents: 0, jobs: 0, needs: 0, applications: 0 });
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const isMountedRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(() => {
    if (!currentUser) return;

    authFetch('/api/clients/' + currentUser.id)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.client && isMountedRef.current) setCompanyName(d.client.companyName || ''); })
      .catch(() => {});

    authFetch('/api/job-posts')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.jobPosts && isMountedRef.current) setStats(s => ({ ...s, jobs: d.jobPosts.length })); })
      .catch(() => {});

    authFetch('/api/agents')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.agents && isMountedRef.current) setStats(s => ({ ...s, agents: d.agents.length })); })
      .catch(() => {});

    authFetch('/api/call-center-needs')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.needs && isMountedRef.current) setStats(s => ({ ...s, needs: d.needs.length })); })
      .catch(() => {});

    authFetch('/api/call-center-needs/interest')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.applications && isMountedRef.current) setStats(s => ({ ...s, applications: d.applications.length })); })
      .catch(() => {});

    if (isMountedRef.current) {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [currentUser]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!currentUser) return;
    setLoading(true);
    loadData();
    pollRef.current = setInterval(loadData, POLL_INTERVAL);
    return () => {
      isMountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentUser, loadData]);

  if (loading && firstLoad) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

  const displayName = companyName || currentUser?.name || 'Call Center';

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Welcome back, {displayName}!</h1>
            <p className="text-green-100 text-sm">Here is an overview of your call center activity</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('client-jobs' as never)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Job Postings</p>
                <p className="text-2xl font-bold mt-1">{stats.jobs}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('client-agents' as never)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Agent Bank</p>
                <p className="text-2xl font-bold mt-1">{stats.agents}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('client-needs' as never)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Staffing Needs</p>
                <p className="text-2xl font-bold mt-1">{stats.needs}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Globe className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('client-applications' as never)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Applications</p>
                <p className="text-2xl font-bold mt-1">{stats.applications}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigateTo('client-applications' as never)}>
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Applications</span>
              <span className="text-xs text-gray-400">View agent applications</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigateTo('client-needs' as never)}>
              <Briefcase className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Staffing Needs</span>
              <span className="text-xs text-gray-400">Manage your needs</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigateTo('client-agents' as never)}>
              <Users className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium">Explore Agent Bank</span>
              <span className="text-xs text-gray-400">Find qualified agents</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigateTo('messages' as never)}>
              <MessageCircle className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium">Messages</span>
              <span className="text-xs text-gray-400">Chat with agents</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Your Subscription</h3>
              <p className="text-sm text-green-700 mt-1">Monthly fee: <strong>2,000 HTG</strong></p>
              <p className="text-xs text-green-600 mt-1">Your account is active and in good standing.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}