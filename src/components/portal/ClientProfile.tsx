'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore, authFetch } from '@/lib/store';
import type { Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2, Building2, Globe, Receipt, User } from 'lucide-react';

const INDUSTRIES = [
  'Customer Service', 'Technical Support', 'Sales & Telemarketing',
  'Healthcare', 'Financial Services', 'E-commerce', 'Travel & Hospitality',
  'Telecommunications', 'Government', 'Education', 'BPO / Call Center', 'Other',
];

export default function ClientProfile() {
  const { currentUser, addToast } = useAppStore();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company info
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companyLink, setCompanyLink] = useState('');

  // Billing info
  const [billingAddress, setBillingAddress] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [taxId, setTaxId] = useState('');

  // Contact info
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    authFetch(`/api/clients?userId=${currentUser.id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then((data) => {
        const c = data.client || (Array.isArray(data.clients) ? data.clients[0] : null);
        if (c) {
          setClient(c);
          setCompanyName(c.companyName || '');
          setIndustry(c.industry || '');
          setCompanyLink(c.companyLink || '');
          setBillingAddress(c.billingAddress || '');
          setBillingEmail(c.billingEmail || '');
          setTaxId(c.taxId || '');
          setContactPerson(c.contactPerson || '');
          setPhone(c.phone || c.user?.phone || '');
        }
      })
      .catch(() => {
        addToast({ title: 'Error loading profile', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [currentUser, addToast]);

  const saveCompany = async () => {
    if (!client) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, industry, companyLink: companyLink || null }),
      });
      if (!res.ok) throw new Error('Save failed');
      addToast({ title: 'Company info saved', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveBilling = async () => {
    if (!client) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingAddress, billingEmail: billingEmail || null, taxId: taxId || null }),
      });
      if (!res.ok) throw new Error('Save failed');
      addToast({ title: 'Billing info saved', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    if (!client) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactPerson, phone }),
      });
      if (!res.ok) throw new Error('Save failed');
      addToast({ title: 'Contact info saved', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Company Profile Found</h3>
          <p className="text-sm text-gray-500">Your client profile could not be loaded. Please contact support if this persists.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Company Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your company information, billing details, and contact info.</p>
      </div>

      {/* Profile summary card */}
      <div className="rounded-xl border bg-white p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4" style={{ borderLeft: '4px solid #16A34A' }}>
        <div className="w-12 h-12 rounded-xl bg-[#0B1A2E] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">{(companyName || 'C')[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{companyName || 'Company Name'}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {industry && <Badge variant="secondary" className="text-xs">{industry}</Badge>}
            {currentUser?.email && <span className="text-xs text-gray-500">{currentUser.email}</span>}
          </div>
        </div>
        <Badge className={currentUser?.accountStatus === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
          {currentUser?.accountStatus?.replace('_', ' ') || 'Active'}
        </Badge>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="company" className="gap-1.5 text-xs sm:text-sm"><Building2 className="h-3.5 w-3.5" />Company</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 text-xs sm:text-sm"><Receipt className="h-3.5 w-3.5" />Billing</TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5 text-xs sm:text-sm"><User className="h-3.5 w-3.5" />Contact</TabsTrigger>
        </TabsList>

        {/* Company Info Tab */}
        <TabsContent value="company">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Company Information</CardTitle>
              <CardDescription>Your business details visible to agents browsing job postings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Company Name <span className="text-red-500">*</span></Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company name" />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-gray-400" /> Industry <span className="text-red-500">*</span></Label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] focus:outline-none">
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => (<option key={i} value={i}>{i}</option>))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Company Website</Label>
                <Input value={companyLink} onChange={(e) => setCompanyLink(e.target.value)} placeholder="https://www.yourcompany.com" />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveCompany} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Company Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Billing Information</CardTitle>
              <CardDescription>Details used for invoicing and payment processing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Billing Address</Label>
                <Input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="Street, City, Country" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing Email</Label>
                  <Input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="billing@company.com" />
                </div>
                <div className="space-y-2">
                  <Label>Tax ID / NIF</Label>
                  <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="Tax identification number" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveBilling} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Billing Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
              <CardDescription>Primary point of contact for your organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Contact Person Name</Label>
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Full name of primary contact" />
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+509 0000 0000" />
              </div>

              <div className="rounded-lg bg-gray-50 border p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Account Email (cannot be changed here)</p>
                <p className="text-sm font-medium text-gray-900">{currentUser?.email}</p>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveContact} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Contact Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}