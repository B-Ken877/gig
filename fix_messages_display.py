#!/usr/bin/env python3
"""Fix: 1) ConversationItem uses lastMessage not latestMessage, 2) handleSelectConversation sets loading=true, 3) notifications for messages."""

filepath = '/root/gig-src/src/components/portal/MessagesPage.tsx'
with open(filepath, 'r') as f:
    c = f.read()

# ─── FIX 1: ConversationItem — use lastMessage instead of latestMessage ────
old_destructure = "  const { otherUser, latestMessage, unreadCount, lastMessageAt } = conversation;"
new_destructure = "  const { otherUser, lastMessage, unreadCount, lastMessageAt } = conversation;"
if old_destructure in c:
    c = c.replace(old_destructure, new_destructure)
    print("FIX 1a: ConversationItem destructures lastMessage")
else:
    print("FIX 1a: pattern not found")

old_preview = """            {latestMessage
              ? latestMessage.content.length > 42
                ? latestMessage.content.substring(0, 42) + '...'
                : latestMessage.content
              : 'No messages yet'}"""
new_preview = """            {lastMessage
              ? lastMessage.length > 42
                ? lastMessage.substring(0, 42) + '...'
                : lastMessage
              : 'No messages yet'}"""
if old_preview in c:
    c = c.replace(old_preview, new_preview)
    print("FIX 1b: ConversationItem uses lastMessage for preview")
else:
    print("FIX 1b: pattern not found")

# ─── FIX 2: handleSelectConversation — set messagesLoading=true before fetch ─
old_select = """  const handleSelectConversation = useCallback((conv: Conversation) => {
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

new_select = """  const handleSelectConversation = useCallback((conv: Conversation) => {
    setActiveConvId(conv.id);
    setActiveOtherUser(conv.otherUser);
    setMessages([]);
    setMessagesLoading(true);
    setMobileShowChat(true);
    // Fetch messages for this conversation
    authFetch(`/api/messages?conversationId=${conv.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages) setMessages(data.messages);
        else setMessages([]);
      })
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
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
    print("FIX 2: handleSelectConversation sets loading=true + handles empty/fetch")
else:
    print("FIX 2: pattern not found")

with open(filepath, 'w') as f:
    f.write(c)
