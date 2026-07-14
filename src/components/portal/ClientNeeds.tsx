'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';

interface NeedItem {
  id: string;
  title: string;
  description: string;
  requirements: string[] | string;
  createdAt: string;
}

export default function ClientNeeds() {
  const { currentUser, addToast } = useAppStore();
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', requirements: '' });
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch('/api/call-center-needs')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.needs)) {
          setNeeds(d.needs.map((n: any) => ({
            ...n,
            requirements: Array.isArray(n.requirements)
              ? n.requirements
              : typeof n.requirements === 'string'
                ? n.requirements.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [],
          })));
        }
      })
      .catch(() => setNeeds([]));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title) return;
    setLoading(true);
    try {
      const res = await fetch('/api/call-center-needs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser!.id,
          'X-User-Role': currentUser!.role,
        },
        body: JSON.stringify({
          ...form,
          requirements: form.requirements.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        addToast({ title: 'Need posted!', variant: 'success' });
        setOpen(false);
        setForm({ title: '', description: '', requirements: '' });
        load();
      }
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/call-center-needs?id=${id}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': currentUser!.id, 'X-User-Role': currentUser!.role },
    });
    addToast({ title: 'Need removed' });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">My Staffing Needs</h2>
          <p className="text-sm text-gray-500">Post what you&apos;re looking for so agents can find you</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
              <Plus className="h-4 w-4 mr-2" />Post Need
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Post a Staffing Need</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Spanish-speaking agents for sales"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Describe your staffing needs..."
                />
              </div>
              <div className="space-y-2">
                <Label>Requirements (comma-separated)</Label>
                <Input
                  value={form.requirements}
                  onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                  placeholder="Spanish, 1+ year experience, home office"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
              >
                {loading ? 'Posting...' : 'Post Need'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {needs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No staffing needs posted yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {needs.map(n => (
            <Card key={n.id}>
              <CardContent className="p-5 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{n.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{n.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {(Array.isArray(n.requirements) ? n.requirements : []).map((r, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(n.id)}
                  className="text-gray-400 hover:text-red-500 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

