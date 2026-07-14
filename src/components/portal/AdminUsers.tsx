'use client';
import { useState, useEffect } from 'react';
import { Users, AlertCircle, RefreshCw, Search, Shield, Ban, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';

export default function AdminUsers() {
  const { currentUser, addToast } = useAppStore();
  const [users, setUsers] = useState<Array<{id:string;name:string;email:string;role:string;accountStatus:string;isActive:boolean;createdAt:string}>>([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadUsers = () => {
    if (!currentUser) return;
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    if (filter) params.set('role', filter);
    fetch('/api/users?' + params, { headers: { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin' } })
      .then(r => { if (!r.ok) throw new Error('Failed to load users'); return r.json(); })
      .then(d => { if (d.users) setUsers(d.users); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadUsers(); }, [currentUser, filter]);

  const handleAction = async (userId: string, action: 'approve' | 'reject' | 'suspend') => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/users/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser!.id, 'X-User-Role': 'admin' },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        const labels = { approve: 'approved', reject: 'rejected', suspend: 'suspended' };
        addToast({ title: 'User ' + labels[action], variant: action === 'approve' ? 'success' : 'destructive' });
        loadUsers();
      } else { addToast({ title: 'Action failed', variant: 'destructive' }); }
    } catch { addToast({ title: 'Network error', variant: 'destructive' }); }
    setActionLoading(null);
  };

  const roleColors: Record<string, string> = { agent: 'bg-blue-100 text-blue-800', client: 'bg-purple-100 text-purple-800', payment_taker: 'bg-amber-100 text-amber-800', admin: 'bg-red-100 text-red-800', recruiter: 'bg-gray-100 text-gray-800' };
  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-800', pending_approval: 'bg-amber-100 text-amber-800', rejected: 'bg-red-100 text-red-800', suspended: 'bg-gray-100 text-gray-800' };

  const filtered = search ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) : users;

  return (
    <div className="space-y-6">
      <div><h2 className="text-lg font-semibold">User Management</h2><p className="text-sm text-gray-500">Manage all users on the platform</p></div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {['', 'agent', 'client', 'payment_taker', 'admin'].map(r => (
            <Button key={r || 'all'} variant={filter === r ? 'default' : 'outline'} size="sm" onClick={() => setFilter(r)} className={filter === r ? 'bg-[#16A34A] text-white hover:bg-[#16A34A]/90' : ''}>{r || 'All'}</Button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-[#16A34A] border-t-transparent rounded-full" /></div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50"><CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" /><p className="text-sm font-medium text-red-700 mb-1">Failed to load users</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadUsers} className="border-red-300 text-red-600 hover:bg-red-100"><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3"><span className={"px-2 py-1 rounded-full text-xs font-medium " + (roleColors[u.role] || '')}>{u.role.replace('_', ' ')}</span></td>
                <td className="px-4 py-3"><span className={"px-2 py-1 rounded-full text-xs font-medium " + (statusColors[u.accountStatus] || '')}>{u.accountStatus.replace('_', ' ')}</span></td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {u.accountStatus === 'pending_approval' && (<>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50" title="Approve" disabled={actionLoading === u.id} onClick={() => handleAction(u.id, 'approve')}><CheckCircle className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50" title="Reject" disabled={actionLoading === u.id} onClick={() => handleAction(u.id, 'reject')}><XCircle className="h-4 w-4" /></Button>
                    </>)}
                    {u.accountStatus === 'active' && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600 hover:bg-amber-50" title="Suspend" disabled={actionLoading === u.id} onClick={() => handleAction(u.id, 'suspend')}><Ban className="h-4 w-4" /></Button>
                    )}
                    {(u.accountStatus === 'rejected' || u.accountStatus === 'suspended') && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50" title="Reactivate" disabled={actionLoading === u.id} onClick={() => handleAction(u.id, 'approve')}><Shield className="h-4 w-4" /></Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (<tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400"><Users className="h-10 w-10 mx-auto mb-2 opacity-30" />No users found</td></tr>)}
          </tbody>
        </table></div></CardContent></Card>
      )}
    </div>
  );
}