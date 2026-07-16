'use client';
import { useState, useEffect } from 'react';
import { Users, Briefcase, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import type { PaymentRequest } from '@/lib/types';

export default function AdminDashboard() {
  const { currentUser, navigateTo } = useAppStore();
  const [stats, setStats] = useState({ agents: 0, clients: 0, pendingPayments: 0, approvedPayments: 0 });
  const [recentPayments, setRecentPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    const headers = { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin' };

    Promise.all([
      fetch('/api/users?role=agent', { headers }).then(r => { if (!r.ok) throw new Error('Failed to load agents'); return r.json(); }),
      fetch('/api/users?role=client', { headers }).then(r => { if (!r.ok) throw new Error('Failed to load clients'); return r.json(); }),
      fetch('/api/payment-requests', { headers }).then(r => { if (!r.ok) throw new Error('Failed to load payments'); return r.json(); }),
    ])
      .then(([agentData, clientData, payData]) => {
        if (agentData.users) setStats(s => ({ ...s, agents: agentData.users.length }));
        if (clientData.users) setStats(s => ({ ...s, clients: clientData.users.length }));
        if (payData.paymentRequests) {
          setRecentPayments(payData.paymentRequests.slice(0, 5));
          setStats(s => ({
            ...s,
            pendingPayments: payData.paymentRequests.filter((p: PaymentRequest) => p.status === 'pending').length,
            approvedPayments: payData.paymentRequests.filter((p: PaymentRequest) => p.status === 'approved').length,
          }));
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, [currentUser]);

  const statCards = [
    { label: 'Total Agents', value: stats.agents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Call Centers', value: stats.clients, icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pending Payments', value: stats.pendingPayments, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved', value: stats.approvedPayments, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
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
          <Button variant="outline" size="sm" onClick={loadDashboard} className="border-red-300 text-red-600 hover:bg-red-100">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}><CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Payment Requests</CardTitle></CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No payment requests yet</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.user?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{p.user?.email} · {p.role} · {p.amount} {p.currency}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {p.status === 'pending' ? (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50 text-xs h-7"
                          onClick={async () => {
                            const res = await fetch('/api/payment-requests', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser!.id, 'X-User-Role': currentUser!.role },
                              body: JSON.stringify({ id: p.id, status: 'approved' }),
                            });
                            if (res.ok) { addToast({ title: p.user?.name + ' approved!', variant: 'success' }); loadData(); }
                          }}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-7"
                          onClick={async () => {
                            const res = await fetch('/api/payment-requests', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser!.id, 'X-User-Role': currentUser!.role },
                              body: JSON.stringify({ id: p.id, status: 'rejected' }),
                            });
                            if (res.ok) { addToast({ title: p.user?.name + ' rejected', variant: 'destructive' }); loadData(); }
                          }}>
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Badge variant={p.status === 'approved' ? 'default' : 'destructive'}>
                        {p.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}