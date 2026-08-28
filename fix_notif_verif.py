#!/usr/bin/env python3
"""Fix: 1) Notification message readable, 2) Add ID verification review to admin dashboard + nav."""

# ─── FIX 1: Messages API — make notification message human-readable ────────
filepath_api = '/root/gig-src/src/app/api/messages/route.ts'
with open(filepath_api, 'r') as f:
    c = f.read()

# Fix notification 1 (existing conversation)
old1 = """        await createNotification({
          userId: recipientIdForNotif,
          title: 'New Message',
          message: JSON.stringify({ conversationId: conversationId, senderId: userId }),
          type: 'message',
        });"""
new1 = """        await createNotification({
          userId: recipientIdForNotif,
          title: 'New Message',
          message: 'You have a new message',
          type: 'message',
          pushBody: 'You have a new message',
        });"""
if old1 in c:
    c = c.replace(old1, new1)
    print("FIX 1a: notification 1 now human-readable")
else:
    print("FIX 1a: pattern not found")

# Fix notification 2 (new conversation)
old2 = """      await createNotification({
        userId: recipient,
        title: 'New Message',
        message: JSON.stringify({ conversationId: conversation.id, senderId: userId }),
        type: 'message',
      });"""
new2 = """      await createNotification({
        userId: recipient,
        title: 'New Message',
        message: 'You have a new message',
        type: 'message',
        pushBody: 'You have a new message',
      });"""
if old2 in c:
    c = c.replace(old2, new2)
    print("FIX 1b: notification 2 now human-readable")
else:
    print("FIX 1b: pattern not found")

# Also fix the job-application notification (it has a similar issue)
old3 = """await createNotification({
          userId: a.id,
          title: 'New Job Application',
          message: (agent.user ? (await db.user.findUnique({ where: { id: agent.userId } }))?.name : 'An agent') + ' applied for \"' + job.jobTitle + '\".',
          type: 'job_application',
        });"""
new3 = """const agentUser = await db.user.findUnique({ where: { id: agent.userId }, select: { name: true } });
        await createNotification({
          userId: a.id,
          title: 'New Job Application',
          message: (agentUser?.name || 'An agent') + ' applied for \"' + job.jobTitle + '\".',
          type: 'job_application',
        });"""
if old3 in c:
    c = c.replace(old3, new3)
    print("FIX 1c: job application notification cleaned up")
else:
    print("FIX 1c: pattern not found (may be in different file)")

with open(filepath_api, 'w') as f:
    f.write(c)

# ─── FIX 1d: PortalLayout — store conversationId separately for message notifs ─
# Instead of parsing the message JSON, we'll use a different approach:
# Store the sender's name in the notification message, and use the type to
# know it's a message. The PortalLayout will set pendingChatUserId from a
# separate field. But since the Notification model doesn't have extra fields,
# we'll encode the senderId in the message like: "senderId:xxx|You have a new message"
# Actually, simpler: just make the message human-readable and use a separate
# mechanism to find the conversation. The PortalLayout already tries to parse
# the message as JSON — let's change it to not parse, and instead just navigate
# to messages. The user can find the conversation from there.
# Actually the user wants clicking the notification to open the SPECIFIC conversation.
# So we need the senderId. Let's store it in the message as: "senderId|You have a new message from John"

filepath_layout = '/root/gig-src/src/components/portal/PortalLayout.tsx'
with open(filepath_layout, 'r') as f:
    lc = f.read()

# Update the notification click handler to parse the new format
old_click = """    if (notif.type === 'message') {
      try {
        const data = JSON.parse(notif.message);
        if (data.senderId) {
          useAppStore.getState().pendingChatUserId = data.senderId;
        }
      } catch {
        // If parse fails, just go to messages page
      }
    }"""
new_click = """    if (notif.type === 'message') {
      // Message format: "senderId|human readable text"
      // We extract the senderId to auto-open the right conversation
      if (notif.message.includes('|')) {
        const senderId = notif.message.split('|')[0];
        if (senderId && senderId.length > 10) {
          useAppStore.getState().pendingChatUserId = senderId;
        }
      }
    }"""
if old_click in lc:
    lc = lc.replace(old_click, new_click)
    print("FIX 1d: PortalLayout parses senderId from pipe-delimited message")
else:
    print("FIX 1d: pattern not found")

with open(filepath_layout, 'w') as f:
    f.write(lc)

# Now update the messages API to use the pipe format
with open(filepath_api, 'r') as f:
    c = f.read()

# Fix notification 1 (existing conversation) — pipe format
old1b = """        await createNotification({
          userId: recipientIdForNotif,
          title: 'New Message',
          message: 'You have a new message',
          type: 'message',
          pushBody: 'You have a new message',
        });"""
new1b = """        const senderUser = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
        await createNotification({
          userId: recipientIdForNotif,
          title: 'New Message',
          message: userId + '|You have a new message from ' + (senderUser?.name || 'someone'),
          type: 'message',
          pushBody: 'You have a new message from ' + (senderUser?.name || 'someone'),
        });"""
if old1b in c:
    c = c.replace(old1b, new1b)
    print("FIX 1e: notification 1 uses pipe format with sender name")
else:
    print("FIX 1e: pattern not found")

# Fix notification 2 (new conversation) — pipe format
old2b = """      await createNotification({
        userId: recipient,
        title: 'New Message',
        message: 'You have a new message',
        type: 'message',
        pushBody: 'You have a new message',
      });"""
new2b = """      const senderUser2 = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
      await createNotification({
        userId: recipient,
        title: 'New Message',
        message: userId + '|You have a new message from ' + (senderUser2?.name || 'someone'),
        type: 'message',
        pushBody: 'You have a new message from ' + (senderUser2?.name || 'someone'),
      });"""
if old2b in c:
    c = c.replace(old2b, new2b)
    print("FIX 1f: notification 2 uses pipe format with sender name")
else:
    print("FIX 1f: pattern not found")

with open(filepath_api, 'w') as f:
    f.write(c)

# ─── FIX 2: PortalLayout — update notification display to strip the senderId prefix ─
with open(filepath_layout, 'r') as f:
    lc = f.read()

old_display = """                    <span className="text-xs text-gray-500">{n.message}</span>"""
new_display = """                    <span className="text-xs text-gray-500">{n.type === 'message' && n.message.includes('|') ? n.message.split('|').slice(1).join('|') : n.message}</span>"""
if old_display in lc:
    lc = lc.replace(old_display, new_display)
    print("FIX 2: notification display strips senderId prefix for messages")
else:
    print("FIX 2: display pattern not found")

with open(filepath_layout, 'w') as f:
    f.write(lc)

# ─── FIX 3: Add ID Verification to admin nav + AdminDashboard ─────────────
# Add to admin nav in PortalLayout
with open(filepath_layout, 'r') as f:
    lc = f.read()

old_nav = "    { label: 'Users', page: 'admin-users', icon: Users },"
new_nav = "    { label: 'ID Verifications', page: 'admin-verifications', icon: ShieldCheck },\n    { label: 'Users', page: 'admin-users', icon: Users },"
if old_nav in lc and 'admin-verifications' not in lc:
    lc = lc.replace(old_nav, new_nav)
    print("FIX 3a: Added ID Verifications to admin nav")
else:
    print("FIX 3a: pattern not found or already added")

# Add page title
old_title = "'admin-users': 'Users',"
new_title = "'admin-users': 'Users', 'admin-verifications': 'ID Verifications',"
if old_title in lc and 'admin-verifications' not in lc.split('getPageTitle')[1][:400]:
    lc = lc.replace(old_title, new_title)
    print("FIX 3b: Added page title")
else:
    print("FIX 3b: pattern not found")

with open(filepath_layout, 'w') as f:
    f.write(lc)

# Add to store.ts VALID_PAGES and ROLE_PAGE_MAP
filepath_store = '/root/gig-src/src/lib/store.ts'
with open(filepath_store, 'r') as f:
    sc = f.read()

if 'admin-verifications' not in sc:
    old_vp = "'admin-placements', 'admin-salary-dates',"
    new_vp = "'admin-placements', 'admin-salary-dates', 'admin-verifications',"
    if old_vp in sc:
        sc = sc.replace(old_vp, new_vp)
        print("FIX 3c: Added to VALID_PAGES")

    old_rp = "'admin-placements', 'admin-salary-dates',\n    'academy', 'messages', 'tickets', 'support',"
    new_rp = "'admin-placements', 'admin-salary-dates', 'admin-verifications',\n    'academy', 'messages', 'tickets', 'support',"
    if old_rp in sc:
        sc = sc.replace(old_rp, new_rp)
        print("FIX 3d: Added to admin ROLE_PAGE_MAP")

with open(filepath_store, 'w') as f:
    f.write(sc)

# Add to types.ts
filepath_types = '/root/gig-src/src/lib/types.ts'
with open(filepath_types, 'r') as f:
    tc = f.read()

if 'admin-verifications' not in tc:
    old_t = "  | 'admin-placements' | 'admin-salary-dates'"
    new_t = "  | 'admin-placements' | 'admin-salary-dates' | 'admin-verifications'"
    if old_t in tc:
        tc = tc.replace(old_t, new_t)
        print("FIX 3e: Added to types.ts")

with open(filepath_types, 'w') as f:
    f.write(tc)

# Add to page.tsx router
filepath_page = '/root/gig-src/src/app/page.tsx'
with open(filepath_page, 'r') as f:
    pc = f.read()

if 'AdminVerifications' not in pc:
    # Add import
    old_imp = "import AdminSalaryDates from '@/components/portal/AdminSalaryDates';"
    new_imp = "import AdminSalaryDates from '@/components/portal/AdminSalaryDates';\nimport AdminVerifications from '@/components/portal/AdminVerifications';"
    if old_imp in pc:
        pc = pc.replace(old_imp, new_imp)
        print("FIX 3f: Added import")

    # Add to PORTAL_PAGES
    old_pp = "'admin-placements', 'admin-salary-dates',"
    new_pp = "'admin-placements', 'admin-salary-dates', 'admin-verifications',"
    if old_pp in pc:
        pc = pc.replace(old_pp, new_pp)
        print("FIX 3g: Added to PORTAL_PAGES")

    # Add render line
    old_render = "{currentPage === 'admin-salary-dates' && <AdminSalaryDates />}"
    new_render = "{currentPage === 'admin-salary-dates' && <AdminSalaryDates />}\n            {currentPage === 'admin-verifications' && <AdminVerifications />}"
    if old_render in pc:
        pc = pc.replace(old_render, new_render)
        print("FIX 3h: Added render line")

with open(filepath_page, 'w') as f:
    f.write(pc)
