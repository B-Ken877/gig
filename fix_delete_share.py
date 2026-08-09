#!/usr/bin/env python3
"""Fix: 1) Admin trash=delete, eye=activate/deactivate, 2) Share=native share sheet."""

# ─── AdminJobPosts: fix trash (DELETE) vs eye (toggle active) ──────────────
filepath = '/root/gig-src/src/components/portal/AdminJobPosts.tsx'
with open(filepath, 'r') as f:
    c = f.read()

# Fix the handleDelete function — make it actually DELETE, not deactivate
old_delete = """  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this job post?')) return;
    try {
      const res = await fetch(`/api/job-posts?id=${id}`, { method: 'DELETE', headers });
      if (res.ok) { addToast({ title: 'Job post deactivated', variant: 'success' }); load(); }
    } catch { addToast({ title: 'Network error', variant: 'destructive' }); }
  };"""

new_delete = """  const handleDelete = async (id: string) => {
    if (!confirm('PERMANENTLY DELETE this job post? This cannot be undone. All applications and video responses for this job will also be deleted.')) return;
    try {
      const res = await fetch(`/api/job-posts?id=${id}&permanent=true`, { method: 'DELETE', headers });
      if (res.ok) { addToast({ title: 'Job post deleted', variant: 'success' }); load(); }
      else { const d = await res.json().catch(() => ({})); addToast({ title: 'Failed to delete', description: d.error || 'Unknown error', variant: 'destructive' }); }
    } catch { addToast({ title: 'Network error', variant: 'destructive' }); }
  };"""

if old_delete in c:
    c = c.replace(old_delete, new_delete)
    print("AdminJobPosts: trash now permanently deletes")
else:
    print("AdminJobPosts: delete pattern not found")

# Fix the share button — use native share sheet, fallback to copy
old_share = """  const handleShare = async (post: JobPost) => {
    const url = `${window.location.origin}/?job=${post.id}#careers`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
      addToast({ title: 'Link copied!', description: 'Direct job link copied to clipboard.', variant: 'success' });
    } catch { addToast({ title: 'Failed to copy', variant: 'destructive' }); }
  };"""

new_share = """  const handleShare = async (post: JobPost) => {
    const url = `${window.location.origin}/?job=${post.id}#careers`;
    const shareData = {
      title: post.jobTitle + ' — Gig Solutions',
      text: 'Check out this remote job: ' + post.jobTitle + ' at Gig Solutions',
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        setCopiedId(post.id);
        setTimeout(() => setCopiedId(null), 2000);
        addToast({ title: 'Link copied!', description: 'Share link copied to clipboard.', variant: 'success' });
      }
    } catch (err) {
      // User cancelled the share sheet — don't show an error
      if (err instanceof Error && err.name === 'AbortError') return;
      // Other errors — fallback to copy
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(post.id);
        setTimeout(() => setCopiedId(null), 2000);
        addToast({ title: 'Link copied!', variant: 'success' });
      } catch { addToast({ title: 'Failed to share', variant: 'destructive' }); }
    }
  };"""

if old_share in c:
    c = c.replace(old_share, new_share)
    print("AdminJobPosts: share now uses native share sheet")
else:
    print("AdminJobPosts: share pattern not found")

with open(filepath, 'w') as f:
    f.write(c)

# ─── CareersPage: fix share button to use native share sheet ───────────────
filepath_careers = '/root/gig-src/src/components/public/CareersPage.tsx'
with open(filepath_careers, 'r') as f:
    c = f.read()

# Replace the copyJobLink function — rename to shareJob and use native share
old_careers_share = """  // Share = always copy the specific job link to clipboard + show toast.
  // We do NOT use navigator.share because some browsers share the page URL
  // instead of the provided URL. Clipboard copy is reliable everywhere.
  const copyJobLink = async (job: JobPost) => {
    const url = `${window.location.origin}/?job=${job.id}#careers`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(job.id);
      setTimeout(() => setCopiedId(null), 2000);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedId(job.id);
        setTimeout(() => setCopiedId(null), 2000);
        document.body.removeChild(textarea);
        return true;
      } catch {
        document.body.removeChild(textarea);
        return false;
      }
    }
  };"""

new_careers_share = """  // Copy the specific job link to clipboard (for the Copy button).
  const copyJobLink = async (job: JobPost) => {
    const url = `${window.location.origin}/?job=${job.id}#careers`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(job.id);
      setTimeout(() => setCopiedId(null), 2000);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedId(job.id);
        setTimeout(() => setCopiedId(null), 2000);
        document.body.removeChild(textarea);
        return true;
      } catch {
        document.body.removeChild(textarea);
        return false;
      }
    }
  };

  // Share = open the native share sheet (WhatsApp, Telegram, email, etc.)
  // Falls back to clipboard copy if the Web Share API is not available.
  const shareJob = async (job: JobPost) => {
    const url = `${window.location.origin}/?job=${job.id}#careers`;
    const shareData = {
      title: job.jobTitle + ' — Gig Solutions',
      text: 'Check out this remote job: ' + job.jobTitle + ' at Gig Solutions',
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await copyJobLink(job);
      }
    } catch (err) {
      // User dismissed the share sheet — don't show an error
      if (err instanceof Error && err.name === 'AbortError') return;
      // Other errors — fallback to copy
      await copyJobLink(job);
    }
  };"""

if old_careers_share in c:
    c = c.replace(old_careers_share, new_careers_share)
    print("CareersPage: added shareJob function (native share sheet)")
else:
    print("CareersPage: share pattern not found")

# Now replace all calls to copyJobLink that should be shareJob
# The share button (Share2 icon) should call shareJob, not copyJobLink
# The copy button (Copy icon) should still call copyJobLink

# In the job card, the Share2 button should call shareJob
old_card_share = """                      <button
                        onClick={() => copyJobLink(job)}
                        className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-[#16A34A] transition-colors"
                        title="Copy job link"
                      >
                        {copiedId === job.id ? <CheckCircle className="h-4 w-4 text-[#16A34A]" /> : <Share2 className="h-4 w-4" />}
                      </button>"""

new_card_share = """                      <button
                        onClick={() => shareJob(job)}
                        className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-[#16A34A] transition-colors"
                        title="Share job"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>"""

if old_card_share in c:
    c = c.replace(old_card_share, new_card_share)
    print("CareersPage: job card share button now calls shareJob")
else:
    print("CareersPage: card share pattern not found")

# In the detail modal, the Share button should call shareJob
old_modal_share = """                <Button
                  variant="outline"
                  onClick={() => copyJobLink(selectedJob)}
                >
                  {copiedId === selectedJob.id ? <><CheckCircle className="h-4 w-4 mr-2 text-[#16A34A]" /> Copied</> : <><Share2 className="h-4 w-4 mr-2" /> Share Link</>}
                </Button>"""

new_modal_share = """                <Button
                  variant="outline"
                  onClick={() => shareJob(selectedJob)}
                >
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </Button>"""

if old_modal_share in c:
    c = c.replace(old_modal_share, new_modal_share)
    print("CareersPage: modal share button now calls shareJob")
else:
    print("CareersPage: modal share pattern not found")

with open(filepath_careers, 'w') as f:
    f.write(c)
