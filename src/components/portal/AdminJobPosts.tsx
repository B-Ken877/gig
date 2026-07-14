'use client';
import { useState, useEffect } from 'react';
import { Plus, ExternalLink, Trash2, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import type { JobPost } from '@/lib/types';

export default function AdminJobPosts() {
  const { currentUser, addToast } = useAppStore();
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyName: '', companyLink: '', jobTitle: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setPageLoading(true);
    setError(null);
    fetch('/api/job-posts')
      .then(r => { if (!r.ok) throw new Error('Failed to load job posts'); return r.json(); })
      .then(d => { if (d.jobPosts) setPosts(d.jobPosts); })
      .catch(err => setError(err.message))
      .finally(() => setPageLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.companyName || !form.jobTitle || !form.description) return;
    setLoading(true);
    try {
      const res = await fetch('/api/job-posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser!.id, 'X-User-Role': 'admin' },
        body: JSON.stringify(form),
      });
      if (res.ok) { addToast({ title: 'Job posted!', variant: 'success' }); setOpen(false); setForm({ companyName: '', companyLink: '', jobTitle: '', description: '' }); load(); }
      else { addToast({ title: 'Failed to create job post', variant: 'destructive' }); }
    } catch { addToast({ title: 'Network error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/job-posts?id=${id}`, { method: 'DELETE', headers: { 'X-User-Id': currentUser!.id, 'X-User-Role': 'admin' } });
      if (res.ok) { addToast({ title: 'Job post removed', variant: 'success' }); load(); }
      else { addToast({ title: 'Failed to delete', variant: 'destructive' }); }
    } catch { addToast({ title: 'Network error', variant: 'destructive' }); }
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
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={load} className="border-red-300 text-red-600 hover:bg-red-100">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Job Postings</h2>
          <p className="text-sm text-gray-500">Post job listings for call centers to view</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"><Plus className="h-4 w-4 mr-2" />New Job Post</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Post a New Job</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Company Name</Label><Input value={form.companyName} onChange={e => setForm(f => ({...f, companyName: e.target.value}))} placeholder="Company name" /></div>
              <div className="space-y-2"><Label>Company Link</Label><Input value={form.companyLink} onChange={e => setForm(f => ({...f, companyLink: e.target.value}))} placeholder="https://careers.company.com/..." /></div>
              <div className="space-y-2"><Label>Job Title</Label><Input value={form.jobTitle} onChange={e => setForm(f => ({...f, jobTitle: e.target.value}))} placeholder="Customer Support Agent" /></div>
              <div className="space-y-2"><Label>Description (copy-paste full job description)</Label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Paste the full job description here..." />
              </div>
              <Button onClick={handleCreate} disabled={loading} className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
                {loading ? 'Posting...' : 'Post Job'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400"><Globe className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No job posts yet. Click "New Job Post" to create one.</p></CardContent></Card>
        ) : posts.map(post => (
          <Card key={post.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{post.companyName}</Badge>
                    <span className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{post.jobTitle}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">{post.description}</p>
                  {post.companyLink && (
                    <a href={post.companyLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-[#16A34A] mt-2 hover:underline">
                      View original posting <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}