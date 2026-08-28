#!/usr/bin/env python3
"""Fix: 1) Remove Documents from nav, 2) timezone-based greeting, 3) no square-in-square."""

# ─── 1. Remove Documents from PortalLayout nav ─────────────────────────────
filepath_layout = '/root/gig-src/src/components/portal/PortalLayout.tsx'
with open(filepath_layout, 'r') as f:
    c = f.read()

old_nav = "    { label: 'My Applications', page: 'agent-applications', icon: ClipboardList },\n    { label: 'Identity Verification', page: 'agent-verify-id', icon: ShieldCheck },\n    { label: 'My Profile', page: 'agent-profile', icon: User },\n    { label: 'Documents', page: 'agent-documents', icon: FileText },\n    { label: 'Availability', page: 'agent-availability', icon: Calendar },"
new_nav = "    { label: 'My Applications', page: 'agent-applications', icon: ClipboardList },\n    { label: 'Identity Verification', page: 'agent-verify-id', icon: ShieldCheck },\n    { label: 'My Profile', page: 'agent-profile', icon: User },\n    { label: 'Availability', page: 'agent-availability', icon: Calendar },"

if old_nav in c:
    c = c.replace(old_nav, new_nav)
    print("PortalLayout: removed Documents from nav")
else:
    print("PortalLayout: pattern not found (may already be removed)")

with open(filepath_layout, 'w') as f:
    f.write(c)

# ─── 2+3. Agent Dashboard: timezone greeting + fix square-in-square ────────
filepath_agent = '/root/gig-src/src/components/portal/AgentDashboard.tsx'
with open(filepath_agent, 'r') as f:
    c = f.read()

# Fix the Card — remove CardContent wrapper, make the gradient div BE the card
# with rounded corners directly. No white padding.
old_card = """      <Card className="border-0 overflow-hidden shadow-2xl shadow-[#0B1A2E]/20">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-[#0B1A2E] via-[#0d2240] to-[#0f2d52] px-6 py-6 text-white overflow-hidden">"""

new_card = """      <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-[#0B1A2E]/20">
          <div className="relative bg-gradient-to-br from-[#0B1A2E] via-[#0d2240] to-[#0f2d52] px-6 py-6 text-white overflow-hidden">"""

if old_card in c:
    c = c.replace(old_card, new_card)
    print("Agent: removed Card wrapper (no more square-in-square)")
else:
    print("Agent: card pattern not found")

# Fix the closing tags — need to close </div> instead of </CardContent></Card>
# The card ends with:
#           </div>
#         </CardContent>
#       </Card>
old_close = """          </div>
        </CardContent>
      </Card>

      {/* ID Verification Popup Modal */}"""
new_close = """          </div>
      </div>

      {/* ID Verification Popup Modal */}"""

if old_close in c:
    c = c.replace(old_close, new_close)
    print("Agent: fixed closing tags")
else:
    print("Agent: closing pattern not found")

# Fix greeting to use the user's timezone
old_greeting = """                  <p className="text-[11px] font-medium text-[#4ADE80] uppercase tracking-wider mb-0.5">
                    {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
                  </p>"""
new_greeting = """                  <p className="text-[11px] font-medium text-[#4ADE80] uppercase tracking-wider mb-0.5">
                    {(() => {
                      const hour = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
                      const h = parseInt(hour);
                      return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
                    })()}
                  </p>"""

if old_greeting in c:
    c = c.replace(old_greeting, new_greeting)
    print("Agent: timezone-based greeting")
else:
    print("Agent: greeting pattern not found")

with open(filepath_agent, 'w') as f:
    f.write(c)

# ─── 2+3. Admin Dashboard: timezone greeting + fix square-in-square ────────
filepath_admin = '/root/gig-src/src/components/portal/AdminDashboard.tsx'
with open(filepath_admin, 'r') as f:
    c = f.read()

old_card_admin = """      <Card className="border-0 overflow-hidden shadow-2xl shadow-[#0B1A2E]/20">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-[#0B1A2E] via-[#0d2240] to-[#0f2d52] px-6 py-6 text-white overflow-hidden">"""

new_card_admin = """      <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-[#0B1A2E]/20">
          <div className="relative bg-gradient-to-br from-[#0B1A2E] via-[#0d2240] to-[#0f2d52] px-6 py-6 text-white overflow-hidden">"""

if old_card_admin in c:
    c = c.replace(old_card_admin, new_card_admin)
    print("Admin: removed Card wrapper")
else:
    print("Admin: card pattern not found")

# Fix closing tags for admin
old_close_admin = """          </div>
        </CardContent>
      </Card>

      {/* Stats */}"""
new_close_admin = """          </div>
      </div>

      {/* Stats */}"""

if old_close_admin in c:
    c = c.replace(old_close_admin, new_close_admin)
    print("Admin: fixed closing tags")
else:
    print("Admin: closing pattern not found")

# Fix greeting for admin
old_greeting_admin = """                  <p className="text-[11px] font-medium text-[#4ADE80] uppercase tracking-wider mb-0.5">
                    {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
                  </p>"""
new_greeting_admin = """                  <p className="text-[11px] font-medium text-[#4ADE80] uppercase tracking-wider mb-0.5">
                    {(() => {
                      const hour = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
                      const h = parseInt(hour);
                      return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
                    })()}
                  </p>"""

if old_greeting_admin in c:
    c = c.replace(old_greeting_admin, new_greeting_admin)
    print("Admin: timezone-based greeting")
else:
    print("Admin: greeting pattern not found")

with open(filepath_admin, 'w') as f:
    f.write(c)
