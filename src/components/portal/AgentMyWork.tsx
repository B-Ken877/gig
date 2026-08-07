'use client';
import { useState, useEffect } from 'react';
import {
  Briefcase, Calendar, DollarSign, Building2, AlertCircle, RefreshCw,
  MapPin, Clock, ChevronRight, TrendingUp, CalendarClock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import type { Placement, SalaryDate } from '@/lib/types';

export default function AgentMyWork() {
  const { currentUser, navigateTo, addToast } = useAppStore();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [salaryDates, setSalaryDates] = useState<SalaryDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<any>(null);

  useEffect(() => {
    if (!currentUser) return;
    const headers = { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role };

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Get the agent record first
        const agentRes = await fetch('/api/agents?userId=' + currentUser.id, { headers });
        const agentData = await agentRes.json();
        const me = agentData.id ? agentData : (agentData.agents || []).find((a: any) => a.userId === currentUser.id);
        setAgent(me);

        if (me) {
          const [placementsRes, salaryRes] = await Promise.all([
            fetch('/api/placements?agentId=' + me.id, { headers }).then(r => r.json()),
            fetch('/api/salary-dates', { headers }).then(r => r.json()),
          ]);
          setPlacements(placementsRes.placements || []);
          setSalaryDates(salaryRes.salaryDates || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load work data');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

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
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activePlacements = placements.filter(p => p.status === 'active');
  const pastPlacements = placements.filter(p => p.status !== 'active');

  // Upcoming salary dates (next 3)
  const now = new Date();
  const upcomingSalaries = salaryDates
    .filter(s => new Date(s.payDate) >= now)
    .slice(0, 3);

  // Personal next payday (earliest active placement's nextSalaryDate, fallback to global salary date)
  const personalNextPayday = activePlacements
    .map(p => p.nextSalaryDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Work</h2>
        <p className="text-sm text-gray-500 mt-1">Your active placements, pay schedule, and work history.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Placements</p>
                <p className="text-2xl font-bold mt-1 text-[#16A34A]">{activePlacements.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold mt-1">{pastPlacements.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Next Payday</p>
                <p className="text-sm font-bold mt-1">
                  {personalNextPayday
                    ? new Date(personalNextPayday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : upcomingSalaries[0]
                      ? new Date(upcomingSalaries[0].payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <CalendarClock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Placements */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#16A34A]" />
              <h3 className="text-sm font-semibold">Active Work</h3>
            </div>
          </div>

          {activePlacements.length === 0 ? (
            <div className="text-center py-10">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">No active placements yet</p>
              <p className="text-xs text-gray-500 mb-4">Apply for jobs from your dashboard to get hired.</p>
              <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => navigateTo('agent-dashboard' as never)}>
                Browse Jobs
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {activePlacements.map(p => (
                <div key={p.id} className="border rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm font-semibold text-gray-900">{p.position}</h4>
                        <Badge variant="secondary" className="text-[10px] uppercase">Active</Badge>
                      </div>
                      {p.jobPost && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                          {p.jobPost.category && <Badge variant="outline" className="text-[10px]">{p.jobPost.category}</Badge>}
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.jobPost.location || 'Remote'}</span>
                          {p.jobPost.shift && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.jobPost.shift}</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        {p.salary != null && (
                          <span className="flex items-center gap-1 text-[#16A34A] font-semibold">
                            <DollarSign className="h-3 w-3" />${p.salary.toFixed(2)} {p.jobPost?.payFrequency === 'hourly' ? '/hr' : ''}
                          </span>
                        )}
                        {p.startDate && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Calendar className="h-3 w-3" />Started {new Date(p.startDate).toLocaleDateString()}
                          </span>
                        )}
                        {p.nextSalaryDate && (
                          <span className="flex items-center gap-1 text-gray-700 font-medium">
                            <CalendarClock className="h-3 w-3" />Next payday: {new Date(p.nextSalaryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {p.notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">{p.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming pay schedule */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-5 w-5 text-[#16A34A]" />
            <h3 className="text-sm font-semibold">Upcoming Pay Schedule</h3>
          </div>
          {upcomingSalaries.length === 0 ? (
            <div className="text-center py-8">
              <CalendarClock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No upcoming pay dates scheduled.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingSalaries.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="h-10 w-10 rounded-lg bg-[#16A34A]/10 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#16A34A] uppercase">{new Date(s.payDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-sm font-bold text-[#16A34A]">{new Date(s.payDate).getDate()}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(s.payDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.frequency && <Badge variant="outline" className="text-[10px] mr-2">{s.frequency}</Badge>}
                      {s.description || 'Pay cycle'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past placements */}
      {pastPlacements.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-semibold">Work History</h3>
            </div>
            <div className="space-y-2">
              {pastPlacements.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 border rounded-lg opacity-75">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{p.position}</p>
                    <p className="text-xs text-gray-500">
                      {p.startDate ? new Date(p.startDate).toLocaleDateString() : ''} — {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Present'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">{p.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
