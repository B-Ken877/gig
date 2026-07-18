'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, authFetch } from '@/lib/store';
import type { Agent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge, VerifiedBadgeStyles, VerifiedBadgeStack, topVerificationTier, GigScoreRing, type VerificationTier } from '@/components/ui/verified-badge';
import { Plus, X, Save, Loader2, Camera, CheckCircle2 } from 'lucide-react';

const COUNTRIES = [
  'Haiti', 'Dominican Republic', 'Jamaica', 'Trinidad and Tobago',
  'Barbados', 'Bahamas', 'Guyana', 'Suriname', 'Belize',
  'United States', 'Canada', 'Colombia', 'Brazil', 'Mexico',
  'Philippines', 'India', 'Nigeria', 'Kenya', 'South Africa', 'Other',
];

const RAM_OPTIONS = ['4GB', '8GB', '16GB', '32GB'];
const INTERNET_OPTIONS = ['5Mbps', '10Mbps', '25Mbps', '50Mbps+'];
const SHIFT_OPTIONS = ['Morning', 'Afternoon', 'Night', 'Flexible'];

export default function AgentProfile() {
  const { currentUser, addToast, updateCurrentUser } = useAppStore();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state — Personal
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  // Professional
  const [languages, setLanguages] = useState<string[]>([]);
  const [langInput, setLangInput] = useState('');
  const [experience, setExperience] = useState(0);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [previousEmployers, setPreviousEmployers] = useState<string[]>([]);
  const [employerInput, setEmployerInput] = useState('');
  const [education, setEducation] = useState<string[]>([]);
  const [eduInput, setEduInput] = useState('');
  // Technical
  const [computerSpecs, setComputerSpecs] = useState('');
  const [ram, setRam] = useState('');
  const [processor, setProcessor] = useState('');
  const [internetSpeed, setInternetSpeed] = useState('');
  const [backupInternet, setBackupInternet] = useState(false);
  const [headsetAvailable, setHeadsetAvailable] = useState(false);
  const [upsAvailable, setUpsAvailable] = useState(false);
  const [preferredShift, setPreferredShift] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');

  // Local avatar preview — mirrors currentUser.avatar but updates immediately after upload
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setAvatarUrl(currentUser.avatar || null);
    fetch(`/api/agents?userId=${currentUser.id}`)
      .then((r) => r.json())
      .then((data) => {
        const a = Array.isArray(data) ? data[0] : data;
        if (a) {
          setAgent(a);
          // Populate form — be defensive: the API returns parsed arrays/objects,
          // but if a future change returns JSON strings we still handle them.
          setPhone(a.user?.phone || '');
          setCountry(a.country || '');
          setAddress(a.address || '');
          setDateOfBirth(a.dateOfBirth ? String(a.dateOfBirth).split('T')[0] : '');
          setLanguages(Array.isArray(a.languages) ? a.languages : (typeof a.languages === 'string' ? safeParse(a.languages, []) : []));
          setExperience(a.experience || 0);
          setSkills(Array.isArray(a.skills) ? a.skills : (typeof a.skills === 'string' ? safeParse(a.skills, []) : []));
          setPreviousEmployers(Array.isArray(a.previousEmployers) ? a.previousEmployers : (typeof a.previousEmployers === 'string' ? safeParse(a.previousEmployers, []) : []));
          setEducation(Array.isArray(a.education) ? a.education : (typeof a.education === 'string' ? safeParse(a.education, []) : []));
          setComputerSpecs(typeof a.computerSpecs === 'object' && a.computerSpecs !== null ? JSON.stringify(a.computerSpecs) : (a.computerSpecs || ''));
          setRam(a.ram || '');
          setProcessor(a.processor || '');
          setInternetSpeed(a.internetSpeed || '');
          setBackupInternet(Boolean(a.backupInternet));
          setHeadsetAvailable(Boolean(a.headsetAvailable));
          setUpsAvailable(Boolean(a.upsAvailable));
          setPreferredShift(a.preferredShift || '');
          setSalaryExpectation(a.salaryExpectation ? String(a.salaryExpectation) : '');
        }
      })
      .catch(() => {
        addToast({ title: 'Error loading profile', description: 'Could not load your saved information.', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [currentUser, addToast]);

  function safeParse<T>(raw: string, fallback: T): T {
    try { const v = JSON.parse(raw); return (Array.isArray(v) ? v : fallback) as T; } catch { return fallback; }
  }

  // ─── Avatar upload ──────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast({ title: 'Invalid file', description: 'Please choose an image file (JPG, PNG, WebP, GIF).', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      addToast({ title: 'Image too large', description: 'Maximum file size is 8 MB.', variant: 'destructive' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: {
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.role,
        },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      // Bust cache by appending a timestamp query param
      const bustUrl = data.avatar + '?t=' + Date.now();
      setAvatarUrl(bustUrl);
      updateCurrentUser({ avatar: bustUrl });
      addToast({ title: 'Profile picture updated!', description: 'Your new photo is now visible across the platform.', variant: 'success' });
    } catch (err) {
      addToast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      // Reset input so the same file can be picked again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Unified save ──────────────────────────────────────────────────────
  // All three save buttons call this. It sends the FULL form state in a single
  // PATCH so nothing gets dropped. Phone is saved on the User model separately
  // (it lives there in the schema).
  const saveAll = async (scope: 'personal' | 'professional' | 'technical') => {
    if (!agent || !currentUser) return;
    setSaving(true);
    try {
      // 1) Update phone on User model (if changed)
      if (phone !== (agent.user?.phone || '')) {
        await fetch('/api/users/phone', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role },
          body: JSON.stringify({ phone }),
        }).catch(() => {});
      }

      // 2) Update ALL agent fields in one PATCH
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role },
        body: JSON.stringify({
          country,
          address,
          dateOfBirth: dateOfBirth || null,
          languages,
          experience,
          skills,
          previousEmployers,
          education,
          computerSpecs,
          ram,
          processor,
          internetSpeed,
          backupInternet,
          headsetAvailable,
          upsAvailable,
          preferredShift: preferredShift || null,
          salaryExpectation: salaryExpectation ? parseFloat(salaryExpectation) : null,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Save failed'); }
      const updated = await res.json();

      // Merge updated agent + new phone into local state
      setAgent(prev => prev ? { ...prev, ...updated, user: { ...prev.user, ...updated.user, phone } } : prev);

      const labels = {
        personal: 'Personal info',
        professional: 'Professional info',
        technical: 'Technical info',
      } as const;
      addToast({
        title: labels[scope] + ' saved!',
        description: 'All your changes have been updated and will appear in the agent bank.',
        variant: 'success',
      });
    } catch (err) {
      addToast({ title: 'Failed to save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Tag helpers
  const addTag = (arr: string[], setArr: (v: string[]) => void, val: string, setVal: (v: string) => void) => {
    const trimmed = val.trim();
    if (trimmed && !arr.includes(trimmed)) {
      setArr([...arr, trimmed]);
    }
    setVal('');
  };
  const removeTag = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.filter((s) => s !== val));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const displayName = currentUser?.name || 'Agent';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Parse the current user's verification tiers
  const myTiers: VerificationTier[] = Array.isArray(currentUser?.verificationTiers)
    ? (currentUser.verificationTiers as VerificationTier[])
    : [];
  const myTopTier = topVerificationTier(myTiers);

  return (
    <div className="space-y-6">
      <VerifiedBadgeStyles />
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your personal, professional, and technical information.</p>
      </div>

      {/* Avatar card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-gray-200">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-[#16A34A] text-white text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            {myTopTier && (
              <span className="absolute -top-2 -right-2">
                <VerifiedBadge tier={myTopTier} iconOnly size="lg" verifiedAt={currentUser?.verifiedAt} />
              </span>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-[#0B1A2E] text-white flex items-center justify-center shadow-lg hover:bg-[#0B1A2E]/90 disabled:opacity-50"
              title="Upload profile picture"
            >
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
              {typeof currentUser?.gigScore === 'number' && currentUser.gigScore > 0 && (
                <GigScoreRing score={currentUser.gigScore} size={32} showLabel={false} />
              )}
            </div>
            <p className="text-sm text-gray-500">{currentUser?.email}</p>
            {myTiers.length > 0 && (
              <div className="mt-2 flex items-center justify-center sm:justify-start">
                <VerifiedBadgeStack tiers={myTiers} size="sm" />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Upload a profile picture from your device. It will be shown in chats, the agent bank, and your applications.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {uploadingAvatar ? 'Uploading...' : 'Change Picture'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="professional">Professional Info</TabsTrigger>
          <TabsTrigger value="technical">Technical Info</TabsTrigger>
        </TabsList>

        {/* ─── Personal Info ─── */}
        <TabsContent value="personal">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Your basic personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={currentUser?.name || ''} disabled className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={currentUser?.email || ''} disabled className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+509 0000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, city, zip"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => saveAll('personal')} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Personal Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Professional Info ─── */}
        <TabsContent value="professional">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Professional Information</CardTitle>
              <CardDescription>Your work experience, skills, and education.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Languages */}
              <div className="space-y-2">
                <Label>Languages</Label>
                <div className="flex gap-2">
                  <Input
                    value={langInput}
                    onChange={(e) => setLangInput(e.target.value)}
                    placeholder="Add a language..."
                    className="max-w-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(languages, setLanguages, langInput, setLangInput);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => addTag(languages, setLanguages, langInput, setLangInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {languages.map((lang) => (
                    <Badge key={lang} variant="secondary" className="gap-1 pr-1">
                      {lang}
                      <button
                        onClick={() => removeTag(languages, setLanguages, lang)}
                        className="ml-0.5 rounded-full hover:bg-gray-200 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-2">
                <Label>Experience (years)</Label>
                <Input
                  type="number"
                  min={0}
                  value={experience}
                  onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                  className="max-w-xs"
                />
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add a skill..."
                    className="max-w-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(skills, setSkills, skillInput, setSkillInput);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => addTag(skills, setSkills, skillInput, setSkillInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                      {skill}
                      <button
                        onClick={() => removeTag(skills, setSkills, skill)}
                        className="ml-0.5 rounded-full hover:bg-gray-200 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Previous Employers */}
              <div className="space-y-2">
                <Label>Previous Employers</Label>
                <div className="flex gap-2">
                  <Input
                    value={employerInput}
                    onChange={(e) => setEmployerInput(e.target.value)}
                    placeholder="Add employer name..."
                    className="max-w-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(previousEmployers, setPreviousEmployers, employerInput, setEmployerInput);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => addTag(previousEmployers, setPreviousEmployers, employerInput, setEmployerInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ul className="space-y-1 mt-1">
                  {previousEmployers.map((emp) => (
                    <li key={emp} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-700">{emp}</span>
                      <button
                        onClick={() => removeTag(previousEmployers, setPreviousEmployers, emp)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Education */}
              <div className="space-y-2">
                <Label>Education</Label>
                <div className="flex gap-2">
                  <Input
                    value={eduInput}
                    onChange={(e) => setEduInput(e.target.value)}
                    placeholder="Add education entry..."
                    className="max-w-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(education, setEducation, eduInput, setEduInput);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => addTag(education, setEducation, eduInput, setEduInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ul className="space-y-1 mt-1">
                  {education.map((edu) => (
                    <li key={edu} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-700">{edu}</span>
                      <button
                        onClick={() => removeTag(education, setEducation, edu)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => saveAll('professional')} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Professional Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Technical Info ─── */}
        <TabsContent value="technical">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Technical Information</CardTitle>
              <CardDescription>Your equipment, internet, and work preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Computer Specifications</Label>
                  <Input
                    value={computerSpecs}
                    onChange={(e) => setComputerSpecs(e.target.value)}
                    placeholder="e.g., Dell Latitude 5520, i7, SSD 512GB"
                  />
                </div>

                <div className="space-y-2">
                  <Label>RAM</Label>
                  <Select value={ram} onValueChange={setRam}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select RAM" />
                    </SelectTrigger>
                    <SelectContent>
                      {RAM_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Processor</Label>
                  <Input
                    value={processor}
                    onChange={(e) => setProcessor(e.target.value)}
                    placeholder="e.g., Intel Core i7-1165G7"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Internet Speed</Label>
                  <Select value={internetSpeed} onValueChange={setInternetSpeed}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select speed" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERNET_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Shift</Label>
                  <Select value={preferredShift} onValueChange={setPreferredShift}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIFT_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Salary Expectation (USD/month)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={salaryExpectation}
                    onChange={(e) => setSalaryExpectation(e.target.value)}
                    placeholder="e.g., 800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                  <Label className="cursor-pointer">Backup Internet</Label>
                  <Switch checked={backupInternet} onCheckedChange={setBackupInternet} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                  <Label className="cursor-pointer">Headset Available</Label>
                  <Switch checked={headsetAvailable} onCheckedChange={setHeadsetAvailable} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                  <Label className="cursor-pointer">UPS Available</Label>
                  <Switch checked={upsAvailable} onCheckedChange={setUpsAvailable} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => saveAll('technical')} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Technical Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reassurance banner */}
      <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
        <CheckCircle2 className="h-4 w-4 text-[#16A34A] mt-0.5 shrink-0" />
        <p>Each save button updates <strong>all</strong> your profile fields, not just the ones on the current tab. You will see a confirmation toast at the top of the screen when your changes are saved.</p>
      </div>
    </div>
  );
}
