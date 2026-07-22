'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Globe, Briefcase, GraduationCap, Cpu, Wifi, Headphones,
  Battery, Languages, Sparkles, Calendar, Mail, ShieldCheck, DollarSign,
  Clock, Monitor, Star, Building2, Link as LinkIcon, X, FileText,
} from 'lucide-react';
import {
  VerifiedBadge,
  VerifiedBadgeStyles,
  VerifiedBadgeStack,
  topVerificationTier,
  type VerificationTier,
} from '@/components/ui/verified-badge';
import { authFetch } from '@/lib/store';

interface UserProfileModalProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Shared full-profile modal.
 *
 * Shows EVERYTHING about a user EXCEPT their phone number (phone is
 * stripped on the server at /api/users/[id]).
 *
 * Used everywhere an agent/user name or avatar is clickable:
 * Agent Bank, Applications, Messages, Team Chat, Reviews, Payment
 * Requests, Admin Users, My Applications, etc.
 */
export function UserProfileModal({ userId, open, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setProfile(null);
    authFetch('/api/users/' + userId)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load profile');
        return r.json();
      })
      .then(data => setProfile(data.user || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [open, userId]);

  const displayName =
    profile?.role === 'client' && profile?.client?.companyName
      ? profile.client.companyName
      : profile?.name || 'User';
  const initials = (displayName || '?')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const tiers: VerificationTier[] = Array.isArray(profile?.verificationTiers)
    ? (profile.verificationTiers as VerificationTier[])
    : (typeof profile?.verificationTiers === 'string'
        ? safeParseArr(profile.verificationTiers)
        : []);
  const topTier = topVerificationTier(tiers);

  const roleLabel = (role: string) => {
    if (role === 'agent') return 'Agent';
    if (role === 'client') return 'Call Center';
    if (role === 'admin' || role === 'payment_taker') return 'Admin';
    return role;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8">
            <div className="relative shrink-0">
              <Avatar className="h-12 w-12">
                {profile?.avatar && <AvatarImage src={profile.avatar} alt={displayName} />}
                <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {topTier && (
                <span className="absolute -bottom-1 -right-1">
                  <VerifiedBadge tier={topTier} iconOnly size="xs" verifiedAt={profile?.verifiedAt} />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate">{displayName}</div>
              <div className="text-xs font-normal text-gray-500 flex items-center gap-2 flex-wrap">
                <span>{profile?.email}</span>
                {profile?.role && (
                  <Badge className="text-[10px] capitalize bg-gray-100 text-gray-700">
                    {roleLabel(profile.role)}
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <VerifiedBadgeStyles />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-[#16A34A] border-t-transparent rounded-full" />
          </div>
        ) : !profile ? (
          <div className="py-8 text-center text-sm text-gray-500">Failed to load profile.</div>
        ) : (
          <div className="space-y-4 text-sm">
            {/* Basic info card */}
            <Section icon={<Mail className="h-3.5 w-3.5" />} title="Basic Information">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" value={profile.name} />
                <Field label="Email" value={profile.email} />
                <Field label="Role" value={roleLabel(profile.role)} />
                <Field label="Status" value={(profile.accountStatus || '').replace(/_/g, ' ')} capitalize />
                <Field
                  label="Joined"
                  value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                />
                <Field
                  label="Active"
                  value={profile.isActive ? 'Yes' : 'No'}
                />
                {profile.role === 'agent' && profile.gigScore != null && (
                  <Field label="Gig Score" value={`${profile.gigScore} pts`} />
                )}
              </div>
            </Section>

            {/* Verification badges */}
            {tiers.length > 0 && (
              <Section icon={<ShieldCheck className="h-3.5 w-3.5" />} title="Verification Badges">
                <div className="flex flex-wrap gap-2">
                  <VerifiedBadgeStack tiers={tiers} size="sm" />
                </div>
                {profile.verifiedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Verified on {new Date(profile.verifiedAt).toLocaleDateString()}
                  </p>
                )}
              </Section>
            )}

            {/* Agent profile details */}
            {profile.agent && (
              <AgentProfileSection agent={profile.agent} />
            )}

            {/* Client profile details */}
            {profile.client && (
              <ClientProfileSection client={profile.client} />
            )}

            {/* Subscription */}
            {(profile.role === 'agent' || profile.role === 'client') && (
              <Section icon={<DollarSign className="h-3.5 w-3.5" />} title="Subscription">
                <div className="flex items-center gap-3">
                  {profile.paid ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <div className="text-sm font-medium text-emerald-700">Active</div>
                      {profile.paidUntil && (
                        <div className="text-xs text-gray-500 ml-auto">
                          until {new Date(profile.paidUntil).toLocaleDateString()}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <div className="text-sm font-medium text-amber-700">Unpaid</div>
                    </>
                  )}
                </div>
                {profile.paymentTier && (
                  <p className="text-xs text-gray-500 mt-2 capitalize">
                    Tier: {(profile.paymentTier || '').replace(/_/g, ' ')}
                  </p>
                )}
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Agent profile section ─────────────────────────────────────────────
function AgentProfileSection({ agent }: { agent: any }) {
  const langs = safeParseArr(agent.languages);
  const skills = safeParseArr(agent.skills);
  const edu = safeParseArr(agent.education);
  const employers = safeParseArr(agent.previousEmployers);

  return (
    <Section icon={<Briefcase className="h-3.5 w-3.5" />} title="Agent Profile">
      <div className="grid grid-cols-2 gap-3">
        {agent.status && (
          <FieldWithIcon icon={<Briefcase className="h-3.5 w-3.5 text-gray-400" />} label="Status" value={agent.status} capitalize />
        )}
        {agent.country && (
          <FieldWithIcon icon={<MapPin className="h-3.5 w-3.5 text-gray-400" />} label="Country" value={agent.country} />
        )}
        {agent.address && (
          <FieldWithIcon icon={<MapPin className="h-3.5 w-3.5 text-gray-400" />} label="Address" value={agent.address} />
        )}
        {agent.experience != null && agent.experience > 0 && (
          <FieldWithIcon icon={<Briefcase className="h-3.5 w-3.5 text-gray-400" />} label="Experience" value={`${agent.experience} year(s)`} />
        )}
        {agent.dateOfBirth && (
          <FieldWithIcon icon={<Calendar className="h-3.5 w-3.5 text-gray-400" />} label="Date of Birth" value={new Date(agent.dateOfBirth).toLocaleDateString()} />
        )}
        {agent.preferredShift && (
          <FieldWithIcon icon={<Clock className="h-3.5 w-3.5 text-gray-400" />} label="Preferred Shift" value={agent.preferredShift} />
        )}
        {agent.salaryExpectation != null && agent.salaryExpectation > 0 && (
          <FieldWithIcon icon={<DollarSign className="h-3.5 w-3.5 text-gray-400" />} label="Salary Expectation" value={`${agent.salaryExpectation} USD/month`} />
        )}
        {agent.niu && (
          <FieldWithIcon icon={<FileText className="h-3.5 w-3.5 text-gray-400" />} label="NIU (Tax ID)" value={agent.niu} />
        )}
      </div>

      {langs.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
            <Languages className="h-3.5 w-3.5" />Languages
          </div>
          <div className="flex flex-wrap gap-1">
            {langs.map((l: string, i: number) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">{l}</span>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5" />Skills
          </div>
          <div className="flex flex-wrap gap-1">
            {skills.map((s: string, i: number) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      {edu.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
            <GraduationCap className="h-3.5 w-3.5" />Education
          </div>
          <ul className="space-y-0.5 ml-1">
            {edu.map((e: string, i: number) => (
              <li key={i} className="text-xs text-gray-700 flex gap-2">
                <span className="text-gray-400">•</span><span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {employers.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
            <Briefcase className="h-3.5 w-3.5" />Previous Employers
          </div>
          <ul className="space-y-0.5 ml-1">
            {employers.map((e: string, i: number) => (
              <li key={i} className="text-xs text-gray-700 flex gap-2">
                <span className="text-gray-400">•</span><span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Equipment / Computer specs */}
      <div className="mt-3">
        <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1.5">
          <Monitor className="h-3.5 w-3.5" />Equipment
        </div>
        <div className="grid grid-cols-2 gap-2">
          {agent.processor && (
            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <Cpu className="h-3 w-3 text-gray-400" /><span><b className="font-medium">CPU:</b> {agent.processor}</span>
            </div>
          )}
          {agent.ram && (
            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <Cpu className="h-3 w-3 text-gray-400" /><span><b className="font-medium">RAM:</b> {agent.ram}</span>
            </div>
          )}
          {agent.internetSpeed && (
            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <Wifi className="h-3 w-3 text-gray-400" /><span><b className="font-medium">Internet:</b> {agent.internetSpeed}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-700">
            <Headphones className="h-3 w-3 text-gray-400" />
            <span><b className="font-medium">Headset:</b> {agent.headsetAvailable ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-700">
            <Battery className="h-3 w-3 text-gray-400" />
            <span><b className="font-medium">UPS:</b> {agent.upsAvailable ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-700">
            <Wifi className="h-3 w-3 text-gray-400" />
            <span><b className="font-medium">Backup Internet:</b> {agent.backupInternet ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Client (Call Center) profile section ──────────────────────────────
function ClientProfileSection({ client }: { client: any }) {
  return (
    <Section icon={<Building2 className="h-3.5 w-3.5" />} title="Call Center Profile">
      <div className="grid grid-cols-2 gap-3">
        {client.companyName && (
          <Field label="Company Name" value={client.companyName} />
        )}
        {client.industry && (
          <Field label="Industry" value={client.industry} />
        )}
        {client.contactPerson && (
          <Field label="Contact Person" value={client.contactPerson} />
        )}
        {client.billingEmail && (
          <Field label="Billing Email" value={client.billingEmail} />
        )}
        {client.billingAddress && (
          <Field label="Billing Address" value={client.billingAddress} />
        )}
        {client.taxId && (
          <Field label="Tax ID" value={client.taxId} />
        )}
      </div>
      {client.companyLink && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <LinkIcon className="h-3.5 w-3.5 text-gray-400" />
          <a
            href={client.companyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#16A34A] hover:underline truncate"
          >
            {client.companyLink}
          </a>
        </div>
      )}
    </Section>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#16A34A]">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, capitalize }: { label: string; value?: string | null; capitalize?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={'font-medium text-gray-900 ' + (capitalize ? 'capitalize ' : '')}>
        {value || '—'}
      </div>
    </div>
  );
}

function FieldWithIcon({ icon, label, value, capitalize }: { icon: React.ReactNode; label: string; value?: string | null; capitalize?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={'font-medium text-gray-900 truncate ' + (capitalize ? 'capitalize ' : '')}>{value || '—'}</div>
      </div>
    </div>
  );
}

function safeParseArr(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}
