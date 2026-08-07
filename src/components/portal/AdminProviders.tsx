'use client';
import { useState, useEffect } from 'react';
import {
  Plus, Trash2, AlertCircle, RefreshCw, Network, Edit3, X, Phone, Mail, User, FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import type { Provider } from '@/lib/types';

interface FormState {
  name: string; contactPerson: string; phone: string; email: string; notes: string;
}
const EMPTY: FormState = { name: '', contactPerson: '', phone: '', email: '', notes: '' };

export default function AdminProviders() {
  const { currentUser, addToast } = useAppStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = currentUser
    ? { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin', 'Content-Type': 'application/json' }
    : {};

  const load = async () => {
    setPageLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/providers', { headers });
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleSave = async () => {
    if (!form.name) {
      addToast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      let res;
      if (editingId) {
        res = await fetch(`/api/providers/${editingId}`, { method: 'PATCH', headers, body: JSON.stringify(form) });
      } else {
        res = await fetch('/api/providers', { method: 'POST', headers, body: JSON.stringify(form) });
      }
      if (res.ok) {
        addToast({ title: editingId ? 'Provider updated' : 'Provider added', variant: 'success' });
        setOpen(false);
        setForm(EMPTY);
        setEditingId(null);
        load();
      } else {
        addToast({ title: 'Failed to save', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p: Provider) => {
    setEditingId(p.id);
    setForm({ name: p.name, contactPerson: p.contactPerson || '', phone: p.phone || '', email: p.email || '', notes: p.notes || '' });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this provider? Their job posts will be unassigned but not deleted.')) return;
    try {
      const res = await fetch(`/api/providers/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        addToast({ title: 'Provider deleted', variant: 'success' });
        load();
      } else {
        addToast({ title: 'Failed to delete', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    }
  };

  if (pageLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Providers</h2>
          <p className="text-sm text-gray-500">Internal record of who gave us each job. Never shown to the public.</p>
        </div>
        <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => { setForm(EMPTY); setEditingId(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Provider
        </Button>
      </div>

      {providers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">
          <Network className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No providers added yet.</p>
          <p className="text-xs mt-1">When a call center (provider) gives you a job to post, add them here for tracking.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map(p => (
            <Card key={p.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#16A34A]/10 flex items-center justify-center">
                      <Network className="h-5 w-5 text-[#16A34A]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      {p._count?.jobPosts != null && (
                        <Badge variant="secondary" className="text-[10px] mt-0.5">{p._count.jobPosts} job{p._count.jobPosts !== 1 ? 's' : ''}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  {p.contactPerson && <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-400" />{p.contactPerson}</div>}
                  {p.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-400" />{p.phone}</div>}
                  {p.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-gray-400" />{p.email}</div>}
                  {p.notes && <div className="flex items-start gap-2 pt-2 mt-2 border-t"><FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" /><p className="text-xs italic">{p.notes}</p></div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(EMPTY); setEditingId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Provider Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="TechCall Inc." />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="John Smith" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 0100" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@provider.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Private notes about this provider..." />
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
              {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Add Provider'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
