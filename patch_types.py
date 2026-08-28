#!/usr/bin/env python3
"""Patch types.ts to add 'agent-verify-id' page type."""
filepath = '/root/gig-src/src/lib/types.ts'

with open(filepath, 'r') as f:
    c = f.read()

# Add 'agent-verify-id' to the PageType union
old = "  | 'agent-dashboard' | 'agent-profile' | 'agent-documents' | 'agent-availability' | 'agent-applications'"
new = "  | 'agent-dashboard' | 'agent-profile' | 'agent-documents' | 'agent-availability' | 'agent-applications'\n  | 'agent-verify-id'"

if old in c and 'agent-verify-id' not in c:
    c = c.replace(old, new)
    print("Added 'agent-verify-id' to PageType")
else:
    print("  (already added or pattern not found)")

with open(filepath, 'w') as f:
    f.write(c)
