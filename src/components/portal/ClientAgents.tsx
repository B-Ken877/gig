'use client';
import { useState, useEffect } from 'react';
import { Search, MessageCircle, Users, MapPin, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';

interface AgentWithUser {
  id: string; userId: string; status: string; country?: string;
  experience: number; languages: string[]; skills: string[];
  preferredShift?: string; salaryExpectation?: number;
  user: { id: string; name: string; email: string; role: string; phone?: string; avatar?: string; accountStatus: string };
}

export default function ClientAgents() {
  const { currentUser, navigateTo, addToast } = useAppStore();
  const [agents, setAgents] = useState<AgentWithUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = () => {
    setLoading(true);
    setError(null);
    fetch('/api/agents')
      .then(r => { if (!r.ok) throw new Error('Failed to load agents'); return r.json(); })
      .then(d => { if (d.agents) setAgents(d.agents.filter((a: AgentWithUser) => a.user?.accountStatus === 'active')); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAgents(); }, []);

  const filtered = search
    ? agents.filter(a => a.user?.name?.toLowerCase().includes(search.toLowerCase()) || a.skills?.some(s => s.toLowerCase().includes(search.toLowerCase())) || a.languages?.some(l => l.toLowerCase().includes(search.toLowerCase())))
    : agents;

  const startChat = async (agentUserId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role },
        body: JSON.stringify({ recipientUserId: agentUserId, content: 'Hi, I found your profile on Gig Solutions and would like to discuss an opportunity.' }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      addToast({ title: 'Message sent!', variant: 'success' });
      navigateTo('messages');
    } catch {
      addToast({ title: 'Failed to send message', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-lg font-semibold">Agent Bank</h2><p className="text-sm text-gray-500">Browse available agents and connect with them directly</p></div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, skill, or language..." className="pl-10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-red-700 mb-1">Failed to load agents</p>
            <p className="text-xs text-red-500 mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={loadAgents} className="border-red-300 text-red-600 hover:bg-red-100">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No agents found</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10"><AvatarFallback className="bg-green-500 text-white text-sm font-semibold">{a.user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{a.user?.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      {a.country && <><MapPin className="h-3 w-3" />{a.country}</>}
                      {a.experience > 0 && <><span className="mx-1">·</span>{a.experience}yr exp</>}
                    </div>
                  </div>
                </div>
                {a.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {a.skills.slice(0, 4).map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}
                    {a.skills.length > 4 && <Badge variant="secondary" className="text-xs">+{a.skills.length - 4}</Badge>}
                  </div>
                )}
                {a.languages?.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Globe className="h-3 w-3" />
                    <span>{a.languages.join(', ')}</span>
                  </div>
                )}
                {a.preferredShift && (
                  <div className="mt-2"><Badge variant="outline" className="text-xs">Shift: {a.preferredShift}</Badge></div>
                )}
                <Button size="sm" variant="outline" className="w-full mt-3 text-[#16A34A] border-[#16A34A]/30 hover:bg-green-50"
                  onClick={() => startChat(a.user.id)}>
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />Contact Agent
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}