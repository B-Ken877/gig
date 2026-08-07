'use client';
import { useState, useEffect } from 'react';
import {
  Users, Search, RefreshCw, AlertCircle, Shield, Mail, Phone, Calendar,
  CheckCircle2, XCircle, MoreHorizontal, User as UserIcon, Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/lib/store';

interface AdminUserRow {
  id: string; email: string; name: string; role: string;
  phone?: string; avatar?: string; isActive: boolean;
  accountStatus: string; createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  agent: 'bg-blue-100 text-blue-800',
  admin: 'bg-red-100 text-red-800',
  payment_taker: 'bg-purple-100 text-purple-800',
  client: 'bg-gray-100 text-gray-800',
};

export default function AdminUsers() {
  const { currentUser, addToast } = useAppStore();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = currentUser
    ? { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role }
    : {};

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users', { headers });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const updateStatus = async (user: AdminUserRow, isActive: boolean, accountStatus: string) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive, accountStatus }),
      });
      if (res.ok) {
        addToast({ title: 'User updated', variant: 'success' });
        load();
      } else {
        addToast({ title: 'Failed to update', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="text-sm text-gray-500">{users.length} total user{users.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-10" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="agent">Agents</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User list */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                  <Avatar className="h-10 w-10">
                    {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                    <AvatarFallback className="bg-[#16A34A] text-white text-xs font-bold">
                      {u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                      <Badge variant="secondary" className={`text-[10px] uppercase ${ROLE_COLORS[u.role] || 'bg-gray-100'}`}>{u.role}</Badge>
                      {!u.isActive && <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</span>
                      {u.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{u.phone}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {u.isActive ? (
                        <DropdownMenuItem onClick={() => updateStatus(u, false, 'suspended')} className="text-red-600">
                          <XCircle className="h-4 w-4 mr-2" /> Suspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => updateStatus(u, true, 'active')}>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Activate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
