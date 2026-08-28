#!/usr/bin/env python3
"""Fix all messaging issues:
1. Name click = open conversation (not profile). Avatar click = open profile.
2. Admin users: avatar + name click opens profile modal.
3. Messages don't load after going back — fix handleSelectConversation to fetch messages.
4. Unread count stuck — mark as read when opening conversation.
5. New messages create notifications (already works, but add conversationId to notification).
6. Notification click opens specific conversation.
"""

filepath = '/root/gig-src/src/components/portal/MessagesPage.tsx'
with open(filepath, 'r') as f:
    c = f.read()

# ─── FIX 1: ConversationItem — name should open conversation, not profile ──
# Currently both the avatar AND name call onShowProfile. Fix: name calls onClick (conversation).

# Fix the name button in ConversationItem
old_name = """            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onShowProfile?.((otherUser as any).id); }}
              className={cn(
                'truncate text-sm font-semibold hover:underline cursor-pointer',
                isActive ? 'text-green-900 hover:text-green-700' : 'text-gray-900 hover:text-[#16A34A]',
              )}
              title="View full profile"
            >
              {otherUser.name}
            </button>"""

new_name = """            <span
              className={cn(
                'truncate text-sm font-semibold',
                isActive ? 'text-green-900' : 'text-gray-900',
              )}
            >
              {otherUser.name}
            </span>"""

if old_name in c:
    c = c.replace(old_name, new_name)
    print("FIX 1: ConversationItem name no longer opens profile (opens conversation instead)")
else:
    print("FIX 1: pattern not found")

# ─── FIX 2: MessageBubble — name should NOT open profile, only avatar ──────
old_bubble_name = """            <button
              type="button"
              onClick={() => onShowProfile?.((otherUser as any).id)}
              className="text-xs font-medium text-gray-500 hover:text-[#16A34A] hover:underline cursor-pointer"
              title="View full profile"
            >
              {otherUser.name}
            </button>"""

new_bubble_name = """            <span className="text-xs font-medium text-gray-500">
              {otherUser.name}
            </span>"""

if old_bubble_name in c:
    c = c.replace(old_bubble_name, new_bubble_name)
    print("FIX 2: MessageBubble name no longer opens profile (avatar still does)")
else:
    print("FIX 2: pattern not found")

# ─── FIX 3: handleSelectConversation — fetch messages + mark as read ───────
old_select = """  const handleSelectConversation = useCallback((conv: Conversation) => {
    setActiveConvId(conv.id);
    setActiveOtherUser(conv.otherUser);
    setMessages([]);
    setMobileShowChat(true);
  }, []);"""

new_select = """  const handleSelectConversation = useCallback((conv: Conversation) => {
    setActiveConvId(conv.id);
    setActiveOtherUser(conv.otherUser);
    setMessages([]);
    setMobileShowChat(true);
    // Fetch messages for this conversation
    authFetch(`/api/messages?conversationId=${conv.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages) setMessages(data.messages);
      })
      .catch(() => {});
    // Mark conversation as read (clears the unread badge)
    authFetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: conv.id }),
    }).then(() => {
      // Update local unread count to 0
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
    }).catch(() => {});
  }, []);"""

if old_select in c:
    c = c.replace(old_select, new_select)
    print("FIX 3: handleSelectConversation now fetches messages + marks as read")
else:
    print("FIX 3: pattern not found")

# ─── FIX 4: Add pendingMessageConvId to store for notification → conversation ─
# We need to pass a conversation ID from the notification to the messages page.
# Add a new state variable that MessagesPage checks on load.
old_profile_state = "  const [profileUserId, setProfileUserId] = useState<string | null>(null);"
new_profile_state = "  const [profileUserId, setProfileUserId] = useState<string | null>(null);\n  const [pendingConvId, setPendingConvId] = useState<string | null>(null);"

if old_profile_state in c and 'pendingConvId' not in c:
    c = c.replace(old_profile_state, new_profile_state)
    print("FIX 4: Added pendingConvId state")
else:
    print("FIX 4: pattern not found or already added")

# ─── FIX 5: Check for pendingChatUserId (from notification) on load ────────
# The existing pendingRef logic checks pendingChatUserId from the store.
# We need to also check a conversationId. Let's use the store's pendingChatUserId
# which is set to the OTHER user's ID, and find the conversation.

# The existing code already does this:
# const pendingRef = useRef(pendingChatUserId);
# It finds the conversation where user1Id or user2Id matches pendingChatUserId.
# This should work. But the notification needs to set pendingChatUserId.

# Let's also add a pendingChatConvId to the store for direct conversation selection.
# Actually, let's use the existing pendingChatUserId which stores the other user's ID.
# The PortalLayout needs to set this when a message notification is clicked.

with open(filepath, 'w') as f:
    f.write(c)

# ─── FIX 6: Messages API — include conversationId in notification metadata ─
filepath_api = '/root/gig-src/src/app/api/messages/route.ts'
with open(filepath_api, 'r') as f:
    ac = f.read()

# Update the notification to include conversationId as part of the message text
# (since the Notification model doesn't have a conversationId field, we'll use
# the message field to include it, and parse it on the client side)
old_notif1 = """      try {
        await createNotification(recipientIdForNotif, {
          title: 'New Message',
          message: 'You have a new message',
          type: 'message',
        });"""
new_notif1 = """      try {
        await createNotification(recipientIdForNotif, {
          title: 'New Message',
          message: JSON.stringify({ conversationId: conversation.id, senderId: userId }),
          type: 'message',
        });"""

if old_notif1 in ac:
    ac = ac.replace(old_notif1, new_notif1)
    print("FIX 6a: notification 1 includes conversationId")
else:
    print("FIX 6a: pattern not found")

old_notif2 = """    try {
      await createNotification(recipient, {
        title: 'New Message',
        message: 'You have a new message',
        type: 'message',
      });"""
new_notif2 = """    try {
      await createNotification(recipient, {
        title: 'New Message',
        message: JSON.stringify({ conversationId: conversation.id, senderId: userId }),
        type: 'message',
      });"""

if old_notif2 in ac:
    ac = ac.replace(old_notif2, new_notif2)
    print("FIX 6b: notification 2 includes conversationId")
else:
    print("FIX 6b: pattern not found")

with open(filepath_api, 'w') as f:
    f.write(ac)

# ─── FIX 7: PortalLayout — notification click opens specific conversation ──
filepath_layout = '/root/gig-src/src/components/portal/PortalLayout.tsx'
with open(filepath_layout, 'r') as f:
    lc = f.read()

# Update getNotificationPage for messages — still go to 'messages' page
# but also set pendingChatUserId so MessagesPage opens the right conversation
old_notif_click = """  const handleNotificationClick = async (notif: Notification) => {
    if (!currentUser) return;
    const targetPage = getNotificationPage(notif, role);
    // Navigate first so the user sees the page immediately.
    navigateTo(targetPage);
    // Then delete the notification from the DB + local state.
    try {
      await authFetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id }),
      });
      useAppStore.getState().setData('notifications', (notifications || []).filter(n => n.id !== notif.id));
    } catch { /* ignore */ }
  };"""

new_notif_click = """  const handleNotificationClick = async (notif: Notification) => {
    if (!currentUser) return;
    const targetPage = getNotificationPage(notif, role);
    // For message notifications, parse the conversationId and set pendingChatUserId
    if (notif.type === 'message') {
      try {
        const data = JSON.parse(notif.message);
        if (data.senderId) {
          useAppStore.getState().pendingChatUserId = data.senderId;
        }
      } catch {
        // If parse fails, just go to messages page
      }
    }
    // Navigate first so the user sees the page immediately.
    navigateTo(targetPage);
    // Then delete the notification from the DB + local state.
    try {
      await authFetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id }),
      });
      useAppStore.getState().setData('notifications', (notifications || []).filter(n => n.id !== notif.id));
    } catch { /* ignore */ }
  };"""

if old_notif_click in lc:
    lc = lc.replace(old_notif_click, new_notif_click)
    print("FIX 7: notification click sets pendingChatUserId for messages")
else:
    print("FIX 7: pattern not found")

with open(filepath_layout, 'w') as f:
    f.write(lc)

# ─── FIX 8: AdminUsers — add profile modal + avatar/name click ─────────────
filepath_admin = '/root/gig-src/src/components/portal/AdminUsers.tsx'
with open(filepath_admin, 'r') as f:
    ac2 = f.read()

# Add UserProfileModal import + state + avatar click handler
if 'UserProfileModal' not in ac2:
    # Add import
    old_imp = "import { useAppStore } from '@/lib/store';"
    new_imp = "import { useAppStore } from '@/lib/store';\nimport { UserProfileModal } from '@/components/ui/user-profile-modal';"
    ac2 = ac2.replace(old_imp, new_imp)
    print("FIX 8a: Added UserProfileModal import to AdminUsers")

# Add state
old_state = "  const [rejectNotes, setRejectNotes] = useState('');"
new_state = "  const [rejectNotes, setRejectNotes] = useState('');\n  const [profileUserId, setProfileUserId] = useState<string | null>(null);"
if old_state in ac2 and 'profileUserId' not in ac2:
    ac2 = ac2.replace(old_state, new_state)
    print("FIX 8b: Added profileUserId state")

# Make avatar clickable
old_avatar = """                    <Avatar className="h-10 w-10">
                      {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                      <AvatarFallback className="bg-[#16A34A] text-white text-xs font-bold">
                        {u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>"""
new_avatar = """                    <button onClick={() => setProfileUserId(u.id)} className="cursor-pointer rounded-full">
                      <Avatar className="h-10 w-10">
                        {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                        <AvatarFallback className="bg-[#16A34A] text-white text-xs font-bold">
                          {u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>"""
if old_avatar in ac2:
    ac2 = ac2.replace(old_avatar, new_avatar)
    print("FIX 8c: Avatar is now clickable")

# Make name clickable
old_name_admin = """                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>"""
new_name_admin = """                        <button onClick={() => setProfileUserId(u.id)} className="text-sm font-semibold text-gray-900 truncate hover:text-[#16A34A] hover:underline cursor-pointer">{u.name}</button>"""
if old_name_admin in ac2:
    ac2 = ac2.replace(old_name_admin, new_name_admin)
    print("FIX 8d: Name is now clickable")

# Add the modal at the end before the closing div
old_end = """    </div>
  );
}"""
new_end = """      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}"""
if old_end in ac2 and 'UserProfileModal' not in ac2.split('return (')[1].split(');')[0]:
    ac2 = ac2.replace(old_end, new_end)
    print("FIX 8e: Added UserProfileModal to AdminUsers render")
else:
    print("FIX 8e: pattern not found (may already exist)")

with open(filepath_admin, 'w') as f:
    f.write(ac2)
