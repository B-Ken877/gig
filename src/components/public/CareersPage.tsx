'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, Share2, Copy, CheckCircle2, MapPin, DollarSign,
  Clock, Briefcase, Search, Filter, Loader2, AlertCircle,
  CheckCircle, X, Sparkles, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import type { JobPost } from '@/lib/types';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const PAY_FREQ_TEXT: Record<string, string> = {
  'hourly': 'Paid hourly',
  'weekly': 'Paid weekly',
  'bi-weekly': 'Paid bi-weekly',
  'monthly': 'Paid monthly',
};

export default function CareersPage() {
  const { navigateTo, isAuthenticated, setPendingJobId } = useAppStore();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/job-posts');
      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json();
      const list: JobPost[] = data.jobPosts || [];
      setJobs(list);

      // ONLY auto-open a job if there's a ?job= URL parameter (shared link).
      // We do NOT use the store's pendingJobId here — that's only for the
      // agent dashboard after clicking Apply + logging in.
      const urlParams = new URLSearchParams(window.location.search);
      const jobParam = urlParams.get('job');
      if (jobParam) {
        const target = list.find(j => j.id === jobParam);
        if (target) setSelectedJob(target);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const categories = ['all', ...Array.from(new Set(jobs.map(j => j.category).filter(Boolean) as string[]))];

  const filtered = jobs.filter(j => {
    if (categoryFilter !== 'all' && j.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return j.jobTitle.toLowerCase().includes(q)
        || j.description.toLowerCase().includes(q)
        || (j.skills || []).some(s => s.toLowerCase().includes(q));
    }
    return true;
  });

  const handleApply = (job: JobPost) => {
    // Stash the job ID so after login, the agent dashboard auto-opens
    // the assessment for this specific job.
    setPendingJobId(job.id);
    if (!isAuthenticated) {
      navigateTo('login');
    } else {
      navigateTo('agent-dashboard');
    }
  };

  // Copy the specific job link to clipboard (for the Copy button).
  const copyJobLink = async (job: JobPost) => {
    const url = `${window.location.origin}/?job=${job.id}#careers`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(job.id);
      setTimeout(() => setCopiedId(null), 2000);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedId(job.id);
        setTimeout(() => setCopiedId(null), 2000);
        document.body.removeChild(textarea);
        return true;
      } catch {
        document.body.removeChild(textarea);
        return false;
      }
    }
  };

  // Share = open the native share sheet (WhatsApp, Telegram, email, etc.)
  // Falls back to clipboard copy if the Web Share API is not available.
  const shareJob = async (job: JobPost) => {
    const url = `${window.location.origin}/?job=${job.id}#careers`;
    const shareData = {
      title: job.jobTitle + ' — Gig Solutions',
      text: 'Check out this remote job: ' + job.jobTitle + ' at Gig Solutions',
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await copyJobLink(job);
      }
    } catch (err) {
      // User dismissed the share sheet — don't show an error
      if (err instanceof Error && err.name === 'AbortError') return;
      // Other errors — fallback to copy
      await copyJobLink(job);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1A2E] text-white">
        <div className="absolute inset-0 opacity-20 bg-[url('/images/hero-careers.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1A2E] via-[#0B1A2E]/90 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
            <motion.span variants={fadeUp} transition={{ duration: 0.5 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#16A34A]/20 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#16A34A]">
              <Sparkles className="h-3.5 w-3.5" /> Open Positions
            </motion.span>
            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight sm:text-5xl">
              Find Your Next <span className="text-[#16A34A]">Remote Job</span>
            </motion.h1>
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Browse our open positions, share jobs with your network, and apply with a quick assessment.
              Create a free account to get started — no payment required.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Search + filters */}
      <section className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by job title, skill, or keyword..."
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-[#16A34A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Jobs list */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-[#16A34A] animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading open positions...</p>
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-red-700 mb-1">Failed to load jobs</p>
              <p className="text-xs text-red-500 mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={load}>Try Again</Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-medium text-gray-700 mb-1">No jobs found</p>
              <p className="text-sm text-gray-500 mb-4">
                {jobs.length === 0
                  ? 'We don\'t have any open positions right now. Check back soon!'
                  : 'Try adjusting your search or filters.'}
              </p>
              {jobs.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => { setSearch(''); setCategoryFilter('all'); }}>
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(job => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow flex flex-col">
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {job.category && (
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{job.category}</Badge>
                        )}
                        {job.shift && (
                          <Badge variant="outline" className="text-[10px]">{job.shift}</Badge>
                        )}
                      </div>
                      <button
                        onClick={() => shareJob(job)}
                        className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-[#16A34A] transition-colors"
                        title="Share job"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{job.jobTitle}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1 text-gray-500">
                        <MapPin className="h-3.5 w-3.5" />{job.location || 'Remote'}
                      </span>
                      {job.hourlyRate > 0 && (
                        <span className="flex items-center gap-1 text-[#16A34A] font-semibold">
                          <DollarSign className="h-3.5 w-3.5" />{job.hourlyRate.toFixed(2)}/hr
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />{PAY_FREQ_TEXT[job.payFrequency] || 'Paid bi-weekly'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 line-clamp-3 flex-1">{job.description}</p>
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {job.skills.slice(0, 4).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                        ))}
                        {job.skills.length > 4 && (
                          <span className="text-[10px] text-gray-400 self-center">+{job.skills.length - 4} more</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        className="flex-1 bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                        onClick={() => handleApply(job)}
                      >
                        Apply Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-3"
                        onClick={() => setSelectedJob(job)}
                        title="View details"
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-3"
                        onClick={() => copyJobLink(job)}
                        title="Copy link"
                      >
                        {copiedId === job.id ? <CheckCircle className="h-4 w-4 text-[#16A34A]" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Job detail modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setSelectedJob(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                {selectedJob.category && <Badge variant="secondary" className="text-[10px] uppercase mb-1">{selectedJob.category}</Badge>}
                <h2 className="text-xl font-bold text-gray-900">{selectedJob.jobTitle}</h2>
              </div>
              <button onClick={() => setSelectedJob(null)} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-gray-600"><MapPin className="h-4 w-4 text-gray-400" />{selectedJob.location || 'Remote'}</span>
                {selectedJob.hourlyRate > 0 && (
                  <span className="flex items-center gap-1.5 text-[#16A34A] font-semibold">
                    <DollarSign className="h-4 w-4" />{selectedJob.hourlyRate.toFixed(2)}/hr
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />{PAY_FREQ_TEXT[selectedJob.payFrequency] || 'Paid bi-weekly'}
                </span>
                {selectedJob.shift && (
                  <span className="flex items-center gap-1.5 text-gray-600"><Clock className="h-4 w-4 text-gray-400" />{selectedJob.shift}</span>
                )}
                <span className="flex items-center gap-1.5 text-gray-400 text-xs"><Clock className="h-3.5 w-3.5" />Posted {new Date(selectedJob.createdAt).toLocaleDateString()}</span>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Job Description</h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
              </div>

              {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Requirements</h4>
                  <ul className="space-y-2">
                    {selectedJob.requirements.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedJob.skills && selectedJob.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((s, i) => (
                      <Badge key={i} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>How to apply:</strong> Click the button below to sign in (or create a free account).
                  Once logged in, you&apos;ll take a quick skills assessment for this role.
                  Pass the assessment and your application will be reviewed by our team.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                  onClick={() => { handleApply(selectedJob); setSelectedJob(null); }}
                >
                  Apply Now <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareJob(selectedJob)}
                >
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => copyJobLink(selectedJob)}
                >
                  {copiedId === selectedJob.id ? <><CheckCircle className="h-4 w-4 mr-2 text-[#16A34A]" /> Copied</> : <><Copy className="h-4 w-4 mr-2" /> Copy Link</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <section className="navy-gradient py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Don&apos;t Have an Account Yet?
          </h2>
          <p className="mt-3 text-base text-white/60">
            Creating an account is free and takes less than a minute. You only need it to apply for jobs.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!isAuthenticated && (
              <Button size="lg" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                onClick={() => navigateTo('register-agent')}>
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigateTo('contact')}>
              Have Questions?
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
