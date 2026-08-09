#!/usr/bin/env python3
"""Fix: 1) Reject requires a reason (no default), 2) API validates notes required for rejection, 3) Notification tells agent the reason + asks to resubmit."""

# ─── FIX 1: API — require notes for rejection ──────────────────────────────
filepath_api = '/root/gig-src/src/app/api/agents/verify-id/[id]/route.ts'
with open(filepath_api, 'r') as f:
    c = f.read()

# Add validation: if status is 'rejected', notes must be provided
old_validate = """    if (!['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Use \"verified\" or \"rejected\".' }, { status: 400 });
    }"""
new_validate = """    if (!['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Use \"verified\" or \"rejected\".' }, { status: 400 });
    }
    // Rejection requires a reason — the admin must explain why
    if (status === 'rejected' && (!notes || !notes.trim())) {
      return NextResponse.json({ error: 'Please provide a reason for the rejection. The agent needs to know why their verification was not approved.' }, { status: 400 });
    }"""
if old_validate in c:
    c = c.replace(old_validate, new_validate)
    print("FIX 1a: API now requires notes for rejection")
else:
    print("FIX 1a: pattern not found")

# Fix the rejection notification — include the reason and ask to resubmit
old_notif = """      } else {
        await createNotification({
          userId: agent.user.id,
          title: 'ID Verification Update',
          message: `Your ID verification was not approved. ${notes || 'Please retake your photos with better lighting and make sure all text is clearly visible.'}`,
          type: 'id_rejected',
        });
      }"""
new_notif = """      } else {
        await createNotification({
          userId: agent.user.id,
          title: 'ID Verification Not Approved',
          message: `Your ID verification was not approved. Reason: ${notes}. Please address this issue and submit your verification again.`,
          type: 'id_rejected',
        });
      }"""
if old_notif in c:
    c = c.replace(old_notif, new_notif)
    print("FIX 1b: Rejection notification now includes the reason + asks to resubmit")
else:
    print("FIX 1b: pattern not found")

with open(filepath_api, 'w') as f:
    f.write(c)

# ─── FIX 2: AdminVerifications — require notes before reject ───────────────
filepath_verif = '/root/gig-src/src/components/portal/AdminVerifications.tsx'
with open(filepath_verif, 'r') as f:
    c = f.read()

# Fix handleReject — don't send a default message, require the admin to type one
old_reject = """  const handleReject = async () => {
    if (!reviewUser?.agentId) return;
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/agents/verify-id/${reviewUser.agentId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes: rejectNotes || 'Please retake your photos with better lighting.' }),
      });"""
new_reject = """  const handleReject = async () => {
    if (!reviewUser?.agentId) return;
    if (!rejectNotes.trim()) {
      addToast({ title: 'Reason required', description: 'Please explain why the verification is being rejected. The agent needs to know what to fix.', variant: 'destructive' });
      return;
    }
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/agents/verify-id/${reviewUser.agentId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes: rejectNotes.trim() }),
      });"""
if old_reject in c:
    c = c.replace(old_reject, new_reject)
    print("FIX 2a: AdminVerifications requires notes before reject")
else:
    print("FIX 2a: pattern not found")

# Make the notes field required (red asterisk)
old_label = """                  <div className=\"space-y-2\">
                    <Label>Rejection notes (optional — shown to the agent if rejected)</Label>
                    <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={2} placeholder=\"e.g. The photo is blurry. Please retake with better lighting.\" />"""
new_label = """                  <div className=\"space-y-2\">
                    <Label>Reason for rejection <span className=\"text-red-500\">*</span> <span className=\"text-xs font-normal text-gray-400\">(required — shown to the agent)</span></Label>
                    <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={3} placeholder=\"e.g. The front photo is blurry and the text is not readable. Please retake with better lighting.\" />"""
if old_label in c:
    c = c.replace(old_label, new_label)
    print("FIX 2b: Notes field marked as required")
else:
    print("FIX 2b: pattern not found")

# Disable the reject button if notes are empty
old_reject_btn = """                    <Button variant=\"outline\" className=\"flex-1 text-red-600 border-red-300 hover:bg-red-50\" onClick={handleReject} disabled={reviewLoading}>
                      <XCircle className=\"h-4 w-4 mr-2\" /> Reject
                    </Button>"""
new_reject_btn = """                    <Button variant=\"outline\" className=\"flex-1 text-red-600 border-red-300 hover:bg-red-50\" onClick={handleReject} disabled={reviewLoading || !rejectNotes.trim()}>
                      <XCircle className=\"h-4 w-4 mr-2\" /> Reject
                    </Button>"""
if old_reject_btn in c:
    c = c.replace(old_reject_btn, new_reject_btn)
    print("FIX 2c: Reject button disabled when notes are empty")
else:
    print("FIX 2c: pattern not found")

with open(filepath_verif, 'w') as f:
    f.write(c)

# ─── FIX 3: AdminUsers — same changes ──────────────────────────────────────
filepath_users = '/root/gig-src/src/components/portal/AdminUsers.tsx'
with open(filepath_users, 'r') as f:
    c = f.read()

# Fix handleReject
old_reject_u = """  const handleReject = async () => {
    if (!reviewUser?.agentId) return;
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/agents/verify-id/${reviewUser.agentId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes: rejectNotes || 'Please retake your photos with better lighting.' }),
      });"""
new_reject_u = """  const handleReject = async () => {
    if (!reviewUser?.agentId) return;
    if (!rejectNotes.trim()) {
      addToast({ title: 'Reason required', description: 'Please explain why the verification is being rejected.', variant: 'destructive' });
      return;
    }
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/agents/verify-id/${reviewUser.agentId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes: rejectNotes.trim() }),
      });"""
if old_reject_u in c:
    c = c.replace(old_reject_u, new_reject_u)
    print("FIX 3a: AdminUsers requires notes before reject")
else:
    print("FIX 3a: pattern not found")

with open(filepath_users, 'w') as f:
    f.write(c)
