'use client';
import { useState, useEffect } from 'react';
import {
  Plus, Trash2, AlertCircle, RefreshCw, Globe, Copy, Check, Edit3, X,
  DollarSign, Clock, MapPin, Tag, Briefcase, Network, Share2, Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import type { JobPost, Provider } from '@/lib/types';

const PAY_FREQUENCIES = ['hourly', 'weekly', 'bi-weekly', 'monthly'];
const CATEGORIES = ['Customer Support', 'Technical Support', 'Sales', 'Live Chat', 'Email Support', 'Appointment Setting', 'Bilingual', 'Virtual Assistant'];
const SHIFTS = ['Morning', 'Afternoon', 'Night', 'Flexible'];

const PAY_LABEL: Record<string, string> = {
  'hourly': 'per hour', 'weekly': 'per week', 'bi-weekly': 'bi-weekly', 'monthly': 'per month',
};

interface FormState {
  jobTitle: string;
  description: string;
  skills: string[];
  requirements: string[];
  hourlyRate: string;
  payFrequency: string;
  category: string;
  shift: string;
  location: string;
  providerId: string;
  commission: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  jobTitle: '', description: '', skills: [], requirements: [],
  hourlyRate: '', payFrequency: 'bi-weekly', category: '', shift: '',
  location: 'Remote', providerId: '', commission: '', isActive: true,
};

export default function AdminJobPosts() {
  const { currentUser, addToast } = useAppStore();
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [skillInput, setSkillInput] = useState('');
  const [reqInput, setReqInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const headers = currentUser
    ? { 'X-User-Id': currentUser.id, 'X-User-Role': 'admin', 'Content-Type': 'application/json' }
    : {};

  const load = async () => {
    setPageLoading(true);
    setError(null);
    try {
      const [jobsRes, providersRes] = await Promise.all([
        fetch('/api/job-posts?all=1', { headers }),
        fetch('/api/providers', { headers }),
      ]);
      const jobsData = await jobsRes.json();
      const providersData = await providersRes.json();
      setPosts(jobsData.jobPosts || []);
      setProviders(providersData.providers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleSave = async () => {
    if (!form.jobTitle || !form.description) {
      addToast({ title: 'Required fields missing', description: 'Job title and description are required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const body = {
        jobTitle: form.jobTitle,
        description: form.description,
        skills: form.skills,
        requirements: form.requirements,
        hourlyRate: Number(form.hourlyRate) || 0,
        payFrequency: form.payFrequency,
        category: form.category || null,
        shift: form.shift || null,
        location: form.location,
        providerId: form.providerId || null,
        commission: Number(form.commission) || 0,
        isActive: form.isActive,
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/job-posts?id=${editingId}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
      } else {
        res = await fetch('/api/job-posts', { method: 'POST', headers, body: JSON.stringify(body) });
      }

      if (res.ok) {
        addToast({ title: editingId ? 'Job updated!' : 'Job posted!', variant: 'success' });
        setOpen(false);
        setForm(EMPTY_FORM);
        setEditingId(null);
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Failed to save', description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post: JobPost) => {
    setEditingId(post.id);
    setForm({
      jobTitle: post.jobTitle,
      description: post.description,
      skills: post.skills || [],
      requirements: post.requirements || [],
      hourlyRate: String(post.hourlyRate || ''),
      payFrequency: post.payFrequency || 'bi-weekly',
      category: post.category || '',
      shift: post.shift || '',
      location: post.location || 'Remote',
      providerId: post.providerId || '',
      commission: String(post.commission || ''),
      isActive: post.isActive,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this job post? It will no longer appear on the career page.')) return;
    try {
      const res = await fetch(`/api/job-posts?id=${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        addToast({ title: 'Job post deactivated', variant: 'success' });
        load();
      } else {
        addToast({ title: 'Failed to delete', variant: 'destructive' });
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (post: JobPost) => {
    try {
      const res = await fetch(`/api/job-posts?id=${post.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: !post.isActive }),
      });
      if (res.ok) {
        addToast({ title: post.isActive ? 'Job deactivated' : 'Job activated', variant: 'success' });
        load();
      }
    } catch {
      addToast({ title: 'Network error', variant: 'destructive' });
    }
  };

  const handleCopyLink = async (post: JobPost) => {
    const url = `${window.location.origin}/?job=${post.id}#careers`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
      addToast({ title: 'Link copied!', description: 'Share it anywhere — agents will land on the career page for this job.', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleShare = async (post: JobPost) => {
    const url = `${window.location.origin}/?job=${post.id}#careers`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.jobTitle + ' — Gig Solutions', text: 'Check out this remote job', url });
      } catch { /* dismissed */ }
    } else {
      handleCopyLink(post);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
      setForm(f => ({ ...f, skills: [...f.skills, skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const addReq = () => {
    if (reqInput.trim() && !form.requirements.includes(reqInput.trim())) {
      setForm(f => ({ ...f, requirements: [...f.requirements, reqInput.trim()] }));
      setReqInput('');
    }
  };

  if (pageLoading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load job posts</p>
          <Button variant="outline" size="sm" onClick={load} className="border-red-300 text-red-600 hover:bg-red-100">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const providerName = (id?: string) => providers.find(p => p.id === id)?.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Job Posts</h2>
          <p className="text-sm text-gray-500">Create and manage job postings. Provider info is internal-only.</p>
        </div>
        <Button
          className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
          onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-2" />New Job Post
        </Button>
      </div>

      {providers.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Network className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 font-medium">No providers yet</p>
              <p className="text-xs text-amber-700">You can still post jobs without a provider, but for accurate tracking, add providers first.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No job posts yet. Click &quot;New Job Post&quot; to create one.</p>
          </CardContent></Card>
        ) : posts.map(post => (
          <Card key={post.id} className={post.isActive ? '' : 'opacity-60'}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{post.category || 'Uncategorized'}</Badge>
                    {post.shift && <Badge variant="outline" className="text-[10px]">{post.shift}</Badge>}
                    {!post.isActive && <Badge variant="secondary" className="text-[10px] bg-gray-200">Inactive</Badge>}
                    <span className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{post.jobTitle}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
                    <span className="flex items-center gap-1 text-gray-500"><MapPin className="h-3 w-3" />{post.location || 'Remote'}</span>
                    {post.hourlyRate > 0 && <span className="flex items-center gap-1 text-[#16A34A] font-semibold"><DollarSign className="h-3 w-3" />${post.hourlyRate.toFixed(2)} {PAY_LABEL[post.payFrequency]}</span>}
                    {post.commission > 0 && <span className="flex items-center gap-1 text-purple-600 font-medium"><Network className="h-3 w-3" />Commission: ${post.commission.toFixed(2)}</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{post.description}</p>

                  {/* Internal-only info — admin sees this, public doesn't */}
                  <div className="mt-3 p-2.5 rounded-md bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2 text-xs">
                      <Network className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500">Provider:</span>
                      <span className="font-medium text-gray-700">{providerName(post.providerId) || '— None —'}</span>
                      {post._count?.applications != null && (
                        <>
                          <span className="text-gray-300 mx-1">·</span>
                          <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-500">Applications:</span>
                          <span className="font-medium text-gray-700">{post._count.applications}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {post.skills && post.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.skills.slice(0, 5).map((s, i) => <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleCopyLink(post)} title="Copy shareable link">
                    {copiedId === post.id ? <Check className="h-4 w-4 text-[#16A34A]" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleShare(post)} title="Share">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(post)} title="Edit">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(post)} title={post.isActive ? 'Deactivate' : 'Activate'}>
                    <Eye className={`h-4 w-4 ${post.isActive ? 'text-[#16A34A]' : 'text-gray-400'}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(EMPTY_FORM); setEditingId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Job Post' : 'Post a New Job'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="Customer Support Agent" />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={6} placeholder="Full job description, responsibilities, what the agent will do..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hourly Rate ($)</Label>
                <Input type="number" step="0.01" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} placeholder="15.00" />
              </div>
              <div className="space-y-2">
                <Label>Pay Frequency</Label>
                <Select value={form.payFrequency} onValueChange={v => setForm(f => ({ ...f, payFrequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAY_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select value={form.shift} onValueChange={v => setForm(f => ({ ...f, shift: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Remote, Haiti, Jamaica..." />
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills Required</Label>
              <div className="flex gap-2">
                <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} placeholder="Type a skill and press Enter" />
                <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
              </div>
              {form.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setForm(f => ({ ...f, skills: f.skills.filter((_, idx) => idx !== i) }))}>
                      {s} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Requirements */}
            <div className="space-y-2">
              <Label>Requirements</Label>
              <div className="flex gap-2">
                <Input value={reqInput} onChange={e => setReqInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReq(); } }} placeholder="Type a requirement and press Enter" />
                <Button type="button" variant="outline" onClick={addReq}>Add</Button>
              </div>
              {form.requirements.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {form.requirements.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="flex-1">• {r}</span>
                      <button onClick={() => setForm(f => ({ ...f, requirements: f.requirements.filter((_, idx) => idx !== i) }))} className="text-gray-400 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Provider (internal) */}
            <div className="space-y-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-gray-500" />
                <Label className="text-xs uppercase tracking-wider text-gray-500">Internal Tracking (not shown to public)</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Provider (who gave us this job)</Label>
                  <Select value={form.providerId} onValueChange={v => setForm(f => ({ ...f, providerId: v }))}>
                    <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                    <SelectContent>
                      {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Commission ($)</Label>
                  <Input type="number" step="0.01" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              <Label htmlFor="isActive" className="text-sm font-normal cursor-pointer">Active (visible on career page)</Label>
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
              {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Post Job'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
