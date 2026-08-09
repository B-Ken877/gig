#!/usr/bin/env python3
"""Patch PortalLayout to add 'Identity Verification' nav item for agents."""
filepath = '/root/gig-src/src/components/portal/PortalLayout.tsx'

with open(filepath, 'r') as f:
    c = f.read()

# Add ShieldCheck to imports if not already there
if 'ShieldCheck' not in c.split('lucide-react')[1].split('}')[0]:
    old_import = "  CalendarClock, Network, ShieldCheck,"
    new_import = "  CalendarClock, Network, ShieldCheck,"
    if old_import in c:
        print("ShieldCheck already imported")
    else:
        old_import2 = "  CalendarClock, Network,"
        new_import2 = "  CalendarClock, Network, ShieldCheck,"
        if old_import2 in c:
            c = c.replace(old_import2, new_import2)
            print("Added ShieldCheck import")
        else:
            print("WARNING: Could not find import to add ShieldCheck")

# Add nav item for agent
old_nav = "{ label: 'My Applications', page: 'agent-applications', icon: ClipboardList },"
new_nav = "{ label: 'My Applications', page: 'agent-applications', icon: ClipboardList },\n    { label: 'Identity Verification', page: 'agent-verify-id', icon: ShieldCheck },"
if old_nav in c and 'agent-verify-id' not in c:
    c = c.replace(old_nav, new_nav)
    print("Added Identity Verification nav item")

# Add page title
old_title = "'agent-applications': 'My Applications', 'agent-my-work': 'My Work',"
new_title = "'agent-applications': 'My Applications', 'agent-my-work': 'My Work', 'agent-verify-id': 'Identity Verification',"
if old_title in c and 'agent-verify-id' not in c.split('getPageTitle')[1][:400]:
    c = c.replace(old_title, new_title)
    print("Added page title for Identity Verification")

with open(filepath, 'w') as f:
    f.write(c)
