#!/usr/bin/env python3
"""Fix the avatar green glow overflow — remove the blur that escapes the circle."""

# ─── Agent Dashboard ───────────────────────────────────────────────────────
filepath_agent = '/root/gig-src/src/components/portal/AgentDashboard.tsx'
with open(filepath_agent, 'r') as f:
    c = f.read()

# Remove the blur glow div that overflows the avatar shape
old_glow_agent = """                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-full blur-md opacity-50" />
                  <Avatar className="relative h-16 w-16 ring-2 ring-white/20 shadow-2xl">"""

new_glow_agent = """                <div className="relative shrink-0">
                  <Avatar className="relative h-16 w-16 ring-2 ring-[#16A34A]/40 shadow-2xl">"""

if old_glow_agent in c:
    c = c.replace(old_glow_agent, new_glow_agent)
    print("Agent: removed overflow glow, using ring instead")
else:
    print("Agent: pattern not found")

with open(filepath_agent, 'w') as f:
    f.write(c)

# ─── Admin Dashboard ───────────────────────────────────────────────────────
filepath_admin = '/root/gig-src/src/components/portal/AdminDashboard.tsx'
with open(filepath_admin, 'r') as f:
    c = f.read()

old_glow_admin = """                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-full blur-md opacity-50" />
                  <Avatar className="relative h-14 w-14 ring-2 ring-white/20 shadow-2xl">"""

new_glow_admin = """                <div className="relative shrink-0">
                  <Avatar className="relative h-14 w-14 ring-2 ring-[#16A34A]/40 shadow-2xl">"""

if old_glow_admin in c:
    c = c.replace(old_glow_admin, new_glow_admin)
    print("Admin: removed overflow glow, using ring instead")
else:
    print("Admin: pattern not found")

with open(filepath_admin, 'w') as f:
    f.write(c)
