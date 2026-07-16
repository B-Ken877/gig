'use client';
import { useState, useEffect } from 'react';
import { Users, MessageCircle, Clock, MapPin, Briefcase, AlertCircle, RefreshCw, Phone, Mail, Eye } from 'lucide-react';
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
  isRead: boolean;
}

export default function ClientApplications() {
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

  // Mark all as read when viewed
  const hasUnread = applications.some(a => !a.isRead);
  useEffect(() => {
    if (!currentUser || !hasUnread) return;
    const unread = applications.filter(a => !a.isRead);
    Promise.all(
      unread.map(a =>
        fetch('/api/notifications/' + a.notificationId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        })
      )
    ).then(() => {
      setApplications(prev => prev.map(a => ({ ...a, isRead: true })));
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  const handleViewApplication = (agentId: string, agentName: string) => {
    // Set the pending chat user so MessagesPage auto-opens this conversation
    useAppStore.getState().pendingChatUserId = agentId;
    useAppStore.getState().navigateTo('messages' as any);
  };

  // Group applications by need
  const grouped = applications.reduce<Record<string, Application[]>>((acc, app) => {
    if (!acc[app.needId]) acc[app.needId] = [];
    acc[app.needId].push(app);
    return acc;
  }, {});

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
            <Users className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Applications</h2>
            <p className="text-xs text-gray-500">{applications.length} application{applications.length !== 1 ? 's' : ''} received</p>
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
            <p className="text-xs text-gray-400 max-w-sm mx-auto">When agents apply to your staffing needs, their applications will appear here with their full profile details.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([needId, apps]) => (
          <div key={needId} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Briefcase className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-800">{apps[0].needTitle}</h3>
              <Badge variant="secondary" className="text-[10px]">{apps.length} applicant{apps.length !== 1 ? 's' : ''}</Badge>
            </div>
            {apps.map(app => (
              <Card key={app.notificationId} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Agent Info */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-semibold text-gray-900">{app.agentName}</h4>
                            <Badge className={app.agentStatus === 'Available' ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-gray-100 text-gray-600 text-[10px]'}>
                              {app.agentStatus}
                            </Badge>
                            {!app.isRead && (
                              <span className="h-2 w-2 rounded-full bg-green-500" />
                            )}
                          </div>

                          {/* Contact */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                            {app.agentEmail && (
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{app.agentEmail}</span>
                            )}
                            {app.agentPhone && (
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{app.agentPhone}</span>
                            )}
                            {app.agentCountry && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{app.agentCountry}</span>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="flex flex-wrap gap-4 mt-3">
                            <div className="text-center">
                              <p className="text-lg font-bold text-gray-900">{app.agentExperience}</p>
                              <p className="text-[10px] text-gray-400 uppercase">Years Exp.</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-gray-900">{(app.agentSkills || []).length}</p>
                              <p className="text-[10px] text-gray-400 uppercase">Skills</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-gray-900">{(app.agentLanguages || []).length}</p>
                              <p className="text-[10px] text-gray-400 uppercase">Languages</p>
                            </div>
                          </div>

                          {/* Languages */}
                          {(app.agentLanguages || []).length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] text-gray-400 uppercase mb-1">Languages</p>
                              <div className="flex flex-wrap gap-1">
                                {(app.agentLanguages || []).slice(0, 6).map((lang, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{lang}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Skills */}
                          {(app.agentSkills || []).length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] text-gray-400 uppercase mb-1">Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {(app.agentSkills || []).slice(0, 8).map((skill, i) => (
                                  <Badge key={i} className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0 border-0">{skill}</Badge>
                                ))}
                                {(app.agentSkills || []).length > 8 && (
                                  <span className="text-[10px] text-gray-400 self-center">+{(app.agentSkills || []).length - 8} more</span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-1 mt-3 text-[10px] text-gray-400">
                            <Clock className="h-3 w-3" />
                            Applied {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action sidebar */}
                    <div className="lg:w-48 bg-gray-50 p-5 flex flex-col items-center justify-center gap-3 border-t lg:border-t-0 lg:border-l border-gray-100">
                      <Button size="sm" className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                        onClick={() => handleViewApplication(app.agentId, app.agentName)}>
                        <Eye className="h-4 w-4 mr-2" />View Application
                      </Button>
                      <p className="text-[10px] text-gray-400 text-center">Opens chat with {app.agentName.split(' ')[0]}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}