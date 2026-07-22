'use client';
import { useState, useEffect } from 'react';
import { ExternalLink, Globe, AlertCircle, RefreshCw, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import type { JobPost } from '@/lib/types';

/**
 * Job Links page — restricted to call centers with an active subscription.
 *
 * Free registration lets the call center explore everything else (post jobs,
 * browse agents, etc.) but Job Links requires 3,000 HTG / year. Unpaid users
 * see a "payment cart" with a button that takes them to the payment chat.
 */
export default function ClientJobs() {
  const { currentUser, navigateTo } = useAppStore();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Subscription check ─────────────────────────────────────────────
  // `paid=true` AND `paidUntil > now` are required to view the job list.
  // If the user is unpaid/expired, we short-circuit and show a payment cart
  // instead of even hitting the API.
  const paidUntil = (currentUser as any)?.paidUntil;
  const isPaid = !!(currentUser as any)?.paid && paidUntil && new Date(paidUntil) > new Date();

  const loadJobs = () => {
    setLoading(true);
    setError(null);
    fetch('/api/job-posts')
      .then(r => { if (!r.ok) throw new Error('Failed to load job links'); return r.json(); })
      .then(d => { if (d.jobPosts) setJobs(d.jobPosts); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isPaid) {
      loadJobs();
    } else {
      setLoading(false);
    }
  }, [isPaid]);

  // ─── Payment gate UI ────────────────────────────────────────────────
  if (!isPaid) {
    const expiryDate = paidUntil ? new Date(paidUntil) : null;
    const isExpired = expiryDate && expiryDate < new Date();
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Job Links</h2>
          <p className="text-sm text-gray-500">Browse available job listings from companies hiring in the Caribbean and beyond</p>
        </div>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center max-w-md mx-auto">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {isExpired ? 'Your subscription has expired' : 'Subscription required'}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {isExpired
                  ? `Your Call Center Yearly subscription expired on ${expiryDate!.toLocaleDateString()}. Renew to keep accessing job listings.`
                  : 'Activate your Call Center Yearly subscription to access job listings from companies hiring across the Caribbean and beyond.'}
              </p>

              {/* Price card */}
              <div className="w-full bg-white rounded-xl border border-amber-200 p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-amber-600" />
                    <span className="font-semibold text-gray-900">Call Center Yearly</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">12 months</Badge>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-gray-900">3,000</span>
                  <span className="text-sm font-medium text-gray-500">HTG / year</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Full access to the Job Links tab — browse every company hiring through Gig Solutions.
                </div>
              </div>

              <Button
                className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90 py-3 text-base font-semibold"
                onClick={() => navigateTo('pending-payment')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay & Activate
              </Button>

              <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 max-w-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  You will be redirected to a chat with the admin to complete your payment.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Paid user — normal UI ──────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load job links</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadJobs} className="border-red-300 text-red-600 hover:bg-red-100">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Job Links</h2>
          <p className="text-sm text-gray-500">Browse available job listings from companies hiring in the Caribbean and beyond</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Subscription Active{paidUntil ? ` · until ${new Date(paidUntil).toLocaleDateString()}` : ''}
        </Badge>
      </div>

      {jobs.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400"><Globe className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-lg">No job links available yet</p><p className="text-sm mt-1">Check back soon for new opportunities</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {jobs.map(j => (
            <Card key={j.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-100 text-green-800 border-0">{j.companyName}</Badge>
                  <span className="text-xs text-gray-400">{new Date(j.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{j.jobTitle}</h3>
                <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{j.description}</div>
                {j.companyLink && (
                  <a href={j.companyLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-[#16A34A] text-white text-sm font-medium hover:bg-[#16A34A]/90 transition-colors">
                    Apply on company site <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
