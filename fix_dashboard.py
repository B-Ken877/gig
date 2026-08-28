#!/usr/bin/env python3
"""Fix AgentDashboard: add ShieldCheck import, add verification gate to handleApply."""

filepath = '/root/gig-src/src/components/portal/AgentDashboard.tsx'

with open(filepath, 'r') as f:
    c = f.read()

# ─── FIX 1: Add ShieldCheck to the lucide-react import ──────────────────────
old_import = "  Briefcase, MapPin, Clock, CheckCircle2, DollarSign, ChevronRight,"
new_import = "  Briefcase, MapPin, Clock, CheckCircle2, DollarSign, ChevronRight, ShieldCheck,"
if 'ShieldCheck' not in c.split('lucide-react')[1].split('}')[0]:
    c = c.replace(old_import, new_import)
    print("FIX 1: Added ShieldCheck to imports")
else:
    print("FIX 1: ShieldCheck already imported")

# ─── FIX 2: Add ID verification gate to handleApply ─────────────────────────
old_apply = """  const handleApply = (job: JobPost) => {
    if (appliedIds.has(job.id)) {
      addToast({ title: 'Already Applied', description: 'You have already applied for this job.', variant: 'default' });
      return;
    }
    // Check the job has assessment questions
    if (!job.assessmentQuestions || job.assessmentQuestions.length === 0) {
      addToast({ title: 'Assessment not ready', description: 'This job does not have assessment questions configured yet. Please try again later.', variant: 'destructive' });
      return;
    }
    setAssessmentJob(job);
  };"""

new_apply = """  const handleApply = (job: JobPost) => {
    if (appliedIds.has(job.id)) {
      addToast({ title: 'Already Applied', description: 'You have already applied for this job.', variant: 'default' });
      return;
    }
    // ─── ID VERIFICATION GATE ────────────────────────────────────────────
    // Only verified agents can apply for jobs. If unverified/pending/rejected,
    // show a popup prompting them to verify first.
    if (idVerificationStatus !== 'verified') {
      const msg = idVerificationStatus === 'pending'
        ? 'Your ID verification is under review. You can apply once it is approved (usually 1-2 business days).'
        : idVerificationStatus === 'rejected'
        ? 'Your ID verification was not approved. Please resubmit your verification to apply for jobs.'
        : 'You must verify your identity before applying for jobs. It only takes 3 minutes.';
      addToast({
        title: 'Identity Verification Required',
        description: msg,
        variant: 'destructive',
      });
      // Redirect to the verification page
      navigateTo('agent-verify-id' as never);
      return;
    }
    // Check the job has assessment questions
    if (!job.assessmentQuestions || job.assessmentQuestions.length === 0) {
      addToast({ title: 'Assessment not ready', description: 'This job does not have assessment questions configured yet. Please try again later.', variant: 'destructive' });
      return;
    }
    setAssessmentJob(job);
  };"""

if old_apply in c:
    c = c.replace(old_apply, new_apply)
    print("FIX 2: Added ID verification gate to handleApply")
else:
    print("FIX 2: handleApply pattern not found (may already be patched)")

with open(filepath, 'w') as f:
    f.write(c)
