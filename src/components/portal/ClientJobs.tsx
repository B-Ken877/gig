'use client';
import { useState, useEffect } from 'react';
import { ExternalLink, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { JobPost } from '@/lib/types';

export default function ClientJobs() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = () => {
    setLoading(true);
    setError(null);
    fetch('/api/job-posts')
      .then(r => { if (!r.ok) throw new Error('Failed to load job postings'); return r.json(); })
      .then(d => { if (d.jobPosts) setJobs(d.jobPosts); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadJobs(); }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load job postings</p>
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
      <div>
        <h2 className="text-lg font-semibold">Job Postings</h2>
        <p className="text-sm text-gray-500">Browse available job listings from companies hiring in the Caribbean and beyond</p>
      </div>

      {jobs.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400"><Globe className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-lg">No job postings available yet</p><p className="text-sm mt-1">Check back soon for new opportunities</p></CardContent></Card>
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