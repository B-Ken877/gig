#!/usr/bin/env python3
"""Patch page.tsx to add the IdentityVerification component import and route."""
filepath = '/root/gig-src/src/app/page.tsx'

with open(filepath, 'r') as f:
    c = f.read()

# 1. Add import
old_import = "import AgentMyWork from '@/components/portal/AgentMyWork';"
new_import = "import AgentMyWork from '@/components/portal/AgentMyWork';\nimport IdentityVerification from '@/components/portal/IdentityVerification';"
if old_import in c and 'IdentityVerification' not in c:
    c = c.replace(old_import, new_import)
    print("Added IdentityVerification import")

# 2. Add to PORTAL_PAGES set
old_portal = "'agent-applications', 'agent-my-work',"
new_portal = "'agent-applications', 'agent-my-work', 'agent-verify-id',"
if old_portal in c and 'agent-verify-id' not in c.split('PORTAL_PAGES')[1][:300]:
    c = c.replace(old_portal, new_portal)
    print("Added 'agent-verify-id' to PORTAL_PAGES")

# 3. Add render line
old_render = "{currentPage === 'agent-my-work' && <AgentMyWork />}"
new_render = "{currentPage === 'agent-my-work' && <AgentMyWork />}\n            {currentPage === 'agent-verify-id' && <IdentityVerification />}"
if old_render in c and 'agent-verify-id' not in c.split('PortalLayout')[1][:500]:
    c = c.replace(old_render, new_render)
    print("Added render line for IdentityVerification")

with open(filepath, 'w') as f:
    f.write(c)
