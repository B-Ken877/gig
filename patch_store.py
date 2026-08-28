#!/usr/bin/env python3
"""Patch store.ts to add 'agent-verify-id' to VALID_PAGES and ROLE_PAGE_MAP."""
filepath = '/root/gig-src/src/lib/store.ts'

with open(filepath, 'r') as f:
    c = f.read()

# Add to VALID_PAGES
old1 = "  'agent-dashboard', 'agent-profile', 'agent-documents', 'agent-availability', 'agent-applications', 'agent-my-work',"
new1 = "  'agent-dashboard', 'agent-profile', 'agent-documents', 'agent-availability', 'agent-applications', 'agent-my-work', 'agent-verify-id',"
if old1 in c and 'agent-verify-id' not in c.split('VALID_PAGES')[1][:500]:
    c = c.replace(old1, new1)
    print("Added 'agent-verify-id' to VALID_PAGES")

# Add to agent ROLE_PAGE_MAP
old2 = "'agent-dashboard', 'agent-profile', 'agent-documents', 'agent-availability',\n    'agent-applications', 'agent-my-work', 'academy', 'messages', 'support',"
new2 = "'agent-dashboard', 'agent-profile', 'agent-documents', 'agent-availability',\n    'agent-applications', 'agent-my-work', 'agent-verify-id', 'academy', 'messages', 'support',"
if old2 in c and 'agent-verify-id' not in c.split('ROLE_PAGE_MAP')[1][:600]:
    c = c.replace(old2, new2)
    print("Added 'agent-verify-id' to agent ROLE_PAGE_MAP")

# Add to PUBLIC_PAGES — NO, verification requires auth, don't add it

with open(filepath, 'w') as f:
    f.write(c)
