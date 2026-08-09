#!/usr/bin/env python3
"""Fix: Radix DropdownMenuItem uses onSelect, not onClick. The onClick fires but
Radix intercepts the event and closes the dropdown before navigateTo can run.
Fix: use onSelect (Radix's native event) instead of onClick."""

filepath = '/root/gig-src/src/components/portal/PortalLayout.tsx'
with open(filepath, 'r') as f:
    c = f.read()

# Fix: change onClick to onSelect on the notification DropdownMenuItem
old = """                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start py-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleNotificationClick(n)}
                  >"""
new = """                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start py-2 cursor-pointer hover:bg-gray-50"
                    onSelect={(e) => { e.preventDefault(); handleNotificationClick(n); }}
                  >"""
if old in c:
    c = c.replace(old, new)
    print("FIXED: notification item now uses onSelect with preventDefault")
else:
    print("Pattern not found")

with open(filepath, 'w') as f:
    f.write(c)
