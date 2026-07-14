'use client';
import { useState, useEffect } from 'react';
import { User, FileText, Calendar, MessageCircle, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export default function AgentDashboard() {
  const { currentUser, navigateTo } = useAppStore();
  const [agent, setAgent] = useState<any>(null);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    const headers = { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role };

    Promise.all([
      fetch('/api/agents', { headers }).then(r => {
        if (!r.ok) throw new Error('Failed to load profile');
        return r.json();
      }),
      fetch('/api/messages?userId=' + currentUser.id, { headers }).then(r => {
        if (!r.ok) throw new Error('Failed to load messages');
        return r.json();
      }),
    ])
      .then(([agentData, msgData]) => {
        if (agentData.agents) {
          const me = agentData.agents.find((a: any) => a.userId === currentUser.id);
          if (me) setAgent(me);
        }
        if (msgData.conversations) {
          setUnreadMsgs(msgData.conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0));
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [currentUser]);

  const quickActions = [
    { label: 'Edit Profile', desc: 'Update your personal info and skills', page: 'agent-profile' as const, icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Documents', desc: 'Upload your resume, ID, certificates', page: 'agent-documents' as const, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Availability', desc: 'Set your available dates and shifts', page: 'agent-availability' as const, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Messages', desc: `${unreadMsgs} unread message${unreadMsgs !== 1 ? 's' : ''}`, page: 'messages' as const, icon: MessageCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

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

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="bg-gradient-to-r from-[#0B1A2E] to-[#1a2d4a] border-0">
        <CardContent className="p-6 text-white">
          <h2 className="text-xl font-bold">Welcome back, {currentUser?.name?.split(' ')[0]}!</h2>
          <p className="text-sm text-gray-300 mt-1">Your profile is active and visible to call centers browsing the agent bank.</p>
          {agent?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {agent.skills.slice(0, 6).map((s: string, i: number) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-medium">{s}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map(a => {
          const Icon = a.icon;
          return (
            <Card key={a.page} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(a.page)}>
              <CardContent className="p-5">
                <div className={`h-10 w-10 rounded-lg ${a.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${a.color}`} />
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

      {/* No profile hint */}
      {!agent && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-amber-700 mb-3">Your agent profile hasn't been set up yet. Complete your profile to appear in search results.</p>
            <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => navigateTo('agent-profile')}>
              <User className="h-3.5 w-3.5 mr-1.5" />Set Up Profile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}