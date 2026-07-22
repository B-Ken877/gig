'use client';
import { useState, useEffect } from 'react';
import {
  Users, MessageCircle, Clock, MapPin, Briefcase, AlertCircle, RefreshCw, Mail, Eye, UserCheck, XCircle,
  GraduationCap, Building, Cpu, Wifi, Headphones, Battery, Banknote, Calendar, Globe, FileText, Home,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore, authFetch } from '@/lib/store';
import { VerifiedBadge, VerifiedBadgeStyles, VerifiedBadgeStack, topVerificationTier, type VerificationTier } from '@/components/ui/verified-badge';
import { UserProfileModal } from '@/components/ui/user-profile-modal';

interface AgentDocument {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
}

interface Application {
  notificationId: string;
  agentId: string;
  agentName: string;
  agentEmail: string;
  agentCountry: string;
  agentAddress: string;
  agentDateOfBirth: string | null;
  agentLanguages: string[];
  agentExperience: number;
  agentSkills: string[];
  agentPreviousEmployers: string[];
  agentEducation: string[];
  agentComputerSpecs: string;
  agentRam: string;
  agentProcessor: string;
  agentInternetSpeed: string;
  agentBackupInternet: boolean;
  agentHeadsetAvailable: boolean;
  agentUpsAvailable: boolean;
  agentPreferredShift: string;
  agentSalaryExpectation: number | null;
  agentNiu: string;
  agentStatus: string;
  agentAvatar?: string | null;
  agentTiers?: VerificationTier[];
  agentGigScore?: number;
  agentDocuments: AgentDocument[];
  needId: string;
  needTitle: string;
  needDescription: string;
  companyName: string;
  clientId: string;
  appliedAt: string;
  isRead: boolean;
  rejectedAt: string | null;
}

export default function ClientApplications() {
  const { currentUser, navigateTo, addToast } = useAppStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hiringId, setHiringId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [hiredAgentIds, setHiredAgentIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
        if (data.applications) {
          setApplications(data.applications);
          // Pre-populate rejected set from server-side flag (so a refresh keeps the state)
          setRejectedIds(new Set(
            data.applications.filter((a: Application) => !!a.rejectedAt).map((a: Application) => a.notificationId)
          ));
        }
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

  const handleViewApplication = (agentId: string, _agentName: string) => {
    // Set the pending chat user so MessagesPage auto-opens this conversation
    useAppStore.getState().pendingChatUserId = agentId;
    useAppStore.getState().navigateTo('messages' as any);
  };

  const handleHire = async (app: Application) => {
    if (!confirm('Hire ' + app.agentName + ' for "' + (app.needTitle || 'this job') + '"?\n\nThey will be notified and added to your team group chat.')) {
      return;
    }
    setHiringId(app.notificationId);
    try {
      const r = await authFetch('/api/applications/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: app.agentId,
          needId: app.needId,
          needTitle: app.needTitle,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to hire');
      }
      const d = await r.json();
      setHiredAgentIds(prev => new Set(prev).add(app.agentId));
      addToast({
        title: 'Hired ' + app.agentName + '!',
        description: d.alreadyMember
          ? 'They were already in your team chat for this job.'
          : 'They\'ve been added to your team chat for "' + (app.needTitle || 'this job') + '".',
        variant: 'success',
      });
      // Auto-open the per-job team chat thread for this hire
      if (d.groupChatId) {
        useAppStore.getState().setPendingGroupChatId(d.groupChatId);
        navigateTo('group-chat' as any);
      }
    } catch (e: any) {
      addToast({ title: e?.message || 'Failed to hire', variant: 'destructive' });
    } finally {
      setHiringId(null);
    }
  };

  const handleReject = async (app: Application) => {
    if (!confirm('Decline ' + app.agentName + '\'s application for "' + (app.needTitle || 'this job') + '"?\n\nThey will be notified.')) {
      return;
    }
    setRejectingId(app.notificationId);
    try {
      const r = await authFetch('/api/applications/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: app.notificationId,
          agentId: app.agentId,
          needTitle: app.needTitle,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to reject');
      }
      setRejectedIds(prev => new Set(prev).add(app.notificationId));
      addToast({
        title: 'Application declined',
        description: app.agentName + ' has been notified.',
        variant: 'default',
      });
    } catch (e: any) {
      addToast({ title: e?.message || 'Failed to reject', variant: 'destructive' });
    } finally {
      setRejectingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      <VerifiedBadgeStyles />
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
            {apps.map(app => {
              const tiers = app.agentTiers || [];
              const topTier = topVerificationTier(tiers);
              const initials = (app.agentName || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const isHired = hiredAgentIds.has(app.agentId);
              const isRejected = rejectedIds.has(app.notificationId);
              const isExpanded = expandedIds.has(app.notificationId);
              return (
              <Card key={app.notificationId} className="overflow-hidden hover:shadow-md transition-shadow relative">
                {topTier && (
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{
                      background: topTier === 'elite' ? 'linear-gradient(90deg, #ffd700, #ffffff, #ffd700)'
                        : topTier === 'top_rated' ? 'linear-gradient(90deg, #ffd54f, #ffb300)'
                        : topTier === 'trusted_partner' ? 'linear-gradient(90deg, #10b981, #059669)'
                        : topTier === 'background_checked' ? 'linear-gradient(90deg, #e53935, #c62828)'
                        : 'linear-gradient(90deg, #1e88e5, #0d47a1)',
                    }}
                  />
                )}
                {isRejected && (
                  <div className="absolute top-0 left-0 right-0 bg-red-50/95 border-b border-red-100 px-4 py-1.5 flex items-center justify-between text-[11px] text-red-700 z-10">
                    <span className="flex items-center gap-1.5"><XCircle className="h-3 w-3" />Application declined{app.rejectedAt ? ' · ' + new Date(app.rejectedAt).toLocaleDateString() : ''}</span>
                  </div>
                )}
                {isHired && (
                  <div className="absolute top-0 left-0 right-0 bg-green-50/95 border-b border-green-100 px-4 py-1.5 flex items-center justify-between text-[11px] text-green-700 z-10">
                    <span className="flex items-center gap-1.5"><UserCheck className="h-3 w-3" />Hired · added to your team chat</span>
                  </div>
                )}
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Agent Info */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => setProfileUserId(app.agentId)}
                            className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
                            title="View full profile"
                          >
                            <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                              {app.agentAvatar && <AvatarImage src={app.agentAvatar} alt={app.agentName} />}
                              <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-sm font-semibold">{initials}</AvatarFallback>
                            </Avatar>
                            {topTier && (
                              <span className="absolute -bottom-1 -right-1">
                                <VerifiedBadge tier={topTier} iconOnly size="xs" />
                              </span>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setProfileUserId(app.agentId)}
                                className="text-base font-semibold text-gray-900 hover:text-[#16A34A] hover:underline cursor-pointer"
                                title="View full profile"
                              >
                                {app.agentName}
                              </button>
                              <Badge className={app.agentStatus === 'Available' ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-gray-100 text-gray-600 text-[10px]'}>
                                {app.agentStatus}
                              </Badge>
                              {!app.isRead && (
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                              )}
                            </div>

                            {/* Contact — phone intentionally omitted */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                              {app.agentEmail && (
                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{app.agentEmail}</span>
                              )}
                              {app.agentCountry && (
                                <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{app.agentCountry}</span>
                              )}
                              {app.agentAddress && (
                                <span className="flex items-center gap-1"><Home className="h-3 w-3" />{app.agentAddress}</span>
                              )}
                              {app.agentDateOfBirth && (
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(app.agentDateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              )}
                              {app.agentPreferredShift && (
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{app.agentPreferredShift} shift</span>
                              )}
                              {app.agentSalaryExpectation != null && app.agentSalaryExpectation > 0 && (
                                <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />${app.agentSalaryExpectation.toLocaleString()}</span>
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
                              {(app.agentDocuments || []).length > 0 && (
                                <div className="text-center">
                                  <p className="text-lg font-bold text-gray-900">{(app.agentDocuments || []).length}</p>
                                  <p className="text-[10px] text-gray-400 uppercase">Docs</p>
                                </div>
                              )}
                            </div>

                            {tiers.length > 0 && (
                              <div className="mt-3">
                                <VerifiedBadgeStack tiers={tiers} size="xs" />
                              </div>
                            )}

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

                            {/* Technical readiness — always show so client sees full profile */}
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-gray-600">
                              <span className="flex items-center gap-1"><Cpu className="h-3 w-3 text-gray-400" />{app.agentProcessor || '—'}</span>
                              <span className="flex items-center gap-1"><Cpu className="h-3 w-3 text-gray-400" />{app.agentRam || '—'} RAM</span>
                              <span className="flex items-center gap-1"><Wifi className="h-3 w-3 text-gray-400" />{app.agentInternetSpeed || '—'}</span>
                              <span className="flex items-center gap-1"><Wifi className={"h-3 w-3 " + (app.agentBackupInternet ? "text-green-500" : "text-gray-300")} />Backup net {app.agentBackupInternet ? '✓' : '×'}</span>
                              <span className="flex items-center gap-1"><Headphones className={"h-3 w-3 " + (app.agentHeadsetAvailable ? "text-green-500" : "text-gray-300")} />Headset {app.agentHeadsetAvailable ? '✓' : '×'}</span>
                              <span className="flex items-center gap-1"><Battery className={"h-3 w-3 " + (app.agentUpsAvailable ? "text-green-500" : "text-gray-300")} />UPS {app.agentUpsAvailable ? '✓' : '×'}</span>
                            </div>

                            {/* Expandable full profile */}
                            <button
                              type="button"
                              onClick={() => toggleExpand(app.notificationId)}
                              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-green-700 hover:text-green-800"
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isExpanded ? 'Show less' : 'Show full profile'}
                            </button>

                            {isExpanded && (
                              <div className="mt-3 space-y-3 border-t pt-3">
                                {/* Previous Employers */}
                                {(app.agentPreviousEmployers || []).length > 0 && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase mb-1 flex items-center gap-1"><Building className="h-3 w-3" />Previous Employers</p>
                                    <ul className="text-xs text-gray-700 list-disc list-inside space-y-0.5">
                                      {app.agentPreviousEmployers.map((emp, i) => (<li key={i}>{emp}</li>))}
                                    </ul>
                                  </div>
                                )}
                                {/* Education */}
                                {(app.agentEducation || []).length > 0 && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase mb-1 flex items-center gap-1"><GraduationCap className="h-3 w-3" />Education</p>
                                    <ul className="text-xs text-gray-700 list-disc list-inside space-y-0.5">
                                      {app.agentEducation.map((edu, i) => (<li key={i}>{edu}</li>))}
                                    </ul>
                                  </div>
                                )}
                                {/* Computer Specs */}
                                {app.agentComputerSpecs && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase mb-1 flex items-center gap-1"><Cpu className="h-3 w-3" />Computer Specs</p>
                                    <p className="text-xs text-gray-700">{app.agentComputerSpecs}</p>
                                  </div>
                                )}
                                {/* Documents */}
                                {(app.agentDocuments || []).length > 0 && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase mb-1 flex items-center gap-1"><FileText className="h-3 w-3" />Documents ({(app.agentDocuments || []).length})</p>
                                    <ul className="text-xs space-y-0.5">
                                      {(app.agentDocuments || []).map(doc => (
                                        <li key={doc.id}>
                                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-800 underline">
                                            {doc.fileName || doc.type}
                                          </a>
                                          <span className="text-gray-400 ml-1">· {doc.type}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {/* Need description */}
                                {app.needDescription && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase mb-1 flex items-center gap-1"><Briefcase className="h-3 w-3" />Job Description</p>
                                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{app.needDescription}</p>
                                  </div>
                                )}
                                {/* NIU (national ID — only shown in expanded view) */}
                                {app.agentNiu && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase mb-1">National ID (NIU)</p>
                                    <p className="text-xs text-gray-700 font-mono">{app.agentNiu}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-1 mt-3 text-[10px] text-gray-400">
                              <Clock className="h-3 w-3" />
                              Applied {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action sidebar */}
                    <div className="lg:w-48 bg-gray-50 p-5 flex flex-col items-center justify-center gap-3 border-t lg:border-t-0 lg:border-l border-gray-100">
                      <Button size="sm" className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                        onClick={() => handleViewApplication(app.agentId, app.agentName)}>
                        <Eye className="h-4 w-4 mr-2" />Message
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-green-300 text-green-700 hover:bg-green-50"
                        disabled={hiringId === app.notificationId || isHired || isRejected}
                        onClick={() => handleHire(app)}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        {isHired ? 'Hired' : (hiringId === app.notificationId ? 'Hiring...' : 'Hire')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        disabled={rejectingId === app.notificationId || isHired || isRejected}
                        onClick={() => handleReject(app)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {isRejected ? 'Declined' : (rejectingId === app.notificationId ? 'Declining...' : 'Decline')}
                      </Button>
                      <p className="text-[10px] text-gray-400 text-center">
                        {isHired ? 'Added to your team chat'
                          : isRejected ? 'Applicant notified'
                          : 'Hire adds them to your team chat'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        ))
      )}
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}
