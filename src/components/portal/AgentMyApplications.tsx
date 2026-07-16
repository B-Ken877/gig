'use client';
import { useState, useEffect } from 'react';
import { Briefcase, MessageCircle, Clock, Building2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore, authFetch } from '@/lib/store';

interface Application {
  notificationId: string;
  agentId: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  agentCountry: string;
  agentLanguages: string[];
  agentExperience: number;
  agentSkills: string[];
  agentStatus: string;
  needId: string;
  needTitle: string;
  needDescription: string;
  companyName: string;
  clientId: string;
  appliedAt: string;
}

export default function AgentMyApplications() {
  const { currentUser, navigateTo, addToast } = useAppStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    authFetch('/api/call-center-needs/interest')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load applications');
        return r.json();
      })
      .then(data => {
        if (data.applications) setApplications(data.applications);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadApplications(); }, [currentUser]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load applications</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadApplications} className="border-red-300 text-red-600 hover:bg-red-100">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">My Applications</h2>
            <p className="text-xs text-gray-500">{applications.length} application{applications.length !== 1 ? 's' : ''} submitted</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadApplications}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
        </Button>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <h3 className="text-sm font-semibold text-gray-500 mb-1">No Applications Yet</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">When you apply to staffing needs from your dashboard, your applications will appear here.</p>
            <Button size="sm" className="mt-4 bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
              onClick={() => navigateTo('agent-dashboard')}>
              Browse Staffing Needs
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <Card key={app.notificationId} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Application Info */}
                  <div className="flex-1 p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-base font-semibold text-gray-900">{app.needTitle}</h4>
                      <Badge className="bg-green-100 text-green-700 text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />Applied
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />{app.companyName || 'Call Center'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />Applied {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {app.needDescription && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">{app.needDescription}</p>
                    )}

                    <div className="flex items-center gap-1 mt-3 text-[10px] text-gray-400">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      A pre-written message was sent to {app.companyName || 'the call center'}. Check your Messages for a response.
                    </div>
                  </div>

                  {/* Action */}
                  <div className="lg:w-48 bg-gray-50 p-5 flex flex-col items-center justify-center gap-3 border-t lg:border-t-0 lg:border-l border-gray-100">
                    <Button size="sm" className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                      onClick={() => navigateTo('messages')}>
                      <MessageCircle className="h-4 w-4 mr-2" />Messages
                    </Button>
                    <p className="text-[10px] text-gray-400 text-center">View your conversation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}