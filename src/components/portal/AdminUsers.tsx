'use client';
import { useState, useEffect } from 'react';
import { Users, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export default function AdminUsers() {
  const { currentUser } = useAppStore();
  const [users, setUsers] = useState<Array<{id:string;name:string;email:string;role:string;accountStatus:string;isActive:boolean;createdAt:string}>>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    const url = filter ? `/api/users?role=${filter}` : '/api/users';
    fetch(url, { headers: { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin' } })
      .then(r => { if (!r.ok) throw new Error('Failed to load users'); return r.json(); })
      .then(d => { if (d.users) setUsers(d.users); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, [currentUser, filter]);

  const roleColors: Record<string, string> = {
    agent: 'bg-blue-100 text-blue-800',
    client: 'bg-purple-100 text-purple-800',
    payment_taker: 'bg-amber-100 text-amber-800',
    admin: 'bg-red-100 text-red-800',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending_approval: 'bg-amber-100 text-amber-800',
    rejected: 'bg-red-100 text-red-800',
    suspended: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-lg font-semibold">User Management</h2><p className="text-sm text-gray-500">Manage all users on the platform</p></div>

      <div className="flex gap-2">
        {['', 'agent', 'client', 'payment_taker', 'admin'].map(r => (
          <Button key={r || 'all'} variant={filter === r ? 'default' : 'outline'} size="sm"
            onClick={() => setFilter(r)} className={filter === r ? 'bg-[#16A34A] text-white hover:bg-[#16A34A]/90' : ''}>
            {r || 'All'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-red-700 mb-1">Failed to load users</p>
            <p className="text-xs text-red-500 mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={loadUsers} className="border-red-300 text-red-600 hover:bg-red-100">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="px-4 py-3 text-left font-medium text-gray-500">Name</th><th className="px-4 py-3 text-left font-medium text-gray-500">Email</th><th className="px-4 py-3 text-left font-medium text-gray-500">Role</th><th className="px-4 py-3 text-left font-medium text-gray-500">Status</th><th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || ''}`}>{u.role.replace('_', ' ')}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[u.accountStatus] || ''}`}>{u.accountStatus.replace('_', ' ')}</span></td>
                      <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400"><Users className="h-10 w-10 mx-auto mb-2 opacity-30" />No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}