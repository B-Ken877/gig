'use client';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppStore, authFetch } from '@/lib/store';

interface NeedItem {
  id: string;
  title: string;
  description: string;
  requirements: string[] | string;
  createdAt: string;
}

// Long descriptions (e.g. multi-paragraph job specs with bullets) are collapsed
// by default to keep the card grid scannable. Click "Show more" to expand.
const DESC_COLLAPSED_MAX = 160; // characters

function NeedDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return <p className="text-sm text-gray-400 italic mt-1">No description</p>;
  }
  const isLong = trimmed.length > DESC_COLLAPSED_MAX;
  const displayed = expanded || !isLong ? trimmed : trimmed.slice(0, DESC_COLLAPSED_MAX).trimEnd() + '…';
  return (
    <div className="mt-1.5">
      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">{displayed}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-green-700 hover:text-green-800"
        >
          {expanded ? <>Show less <ChevronUp className="h-3 w-3" /></> : <>Show more <ChevronDown className="h-3 w-3" /></>}
        </button>
      )}
    </div>
  );
}

export default function ClientNeeds() {
  const { currentUser, addToast } = useAppStore();
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', requirements: '' });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = () => {
    // CRITICAL: must use authFetch so X-User-Id / X-User-Role headers are sent.
    // Without these headers, the GET /api/call-center-needs endpoint cannot
    // scope the query to the current client and returns EVERY call center's
    // jobs (data isolation bug).
    authFetch('/api/call-center-needs')
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
      .catch(() => setNeeds([]))
      .finally(() => setInitialLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/call-center-needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      } else {
        const err = await res.json().catch(() => ({}));
        addToast({ title: 'Failed to post', description: err.error || 'Please try again', variant: 'destructive' });
      }
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this job posting? Agents will no longer be able to apply to it.')) return;
    await authFetch(`/api/call-center-needs?id=${id}`, { method: 'DELETE' });
    addToast({ title: 'Need removed' });
    load();
  };

  const sortedNeeds = useMemo(() => {
    return [...needs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [needs]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold break-words">My Jobs</h2>
          <p className="text-sm text-gray-500 break-words">Post what you&apos;re looking for so agents can find you</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 shrink-0">
              <Plus className="h-4 w-4 mr-2" />Post Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Post a Job</DialogTitle></DialogHeader>
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
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Describe your staffing needs. Line breaks and bullet lists are preserved."
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

      {sortedNeeds.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No jobs posted yet</p>
            <p className="text-sm mt-1">Click “Post Job” to let agents find you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedNeeds.map(n => {
            const reqs = Array.isArray(n.requirements) ? n.requirements : [];
            return (
              <Card key={n.id} className="hover:shadow-md transition-shadow max-w-full overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 break-words">{n.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(n.id)}
                      className="text-gray-400 hover:text-red-500 shrink-0"
                      title="Remove this job"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <NeedDescription text={n.description} />
                  {reqs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {reqs.map((r, i) => (
                        <Badge key={i} variant="secondary" className="text-xs break-words">{r}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
