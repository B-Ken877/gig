#!/usr/bin/env python3
filepath = '/root/gig-src/src/components/portal/MessagesPage.tsx'
with open(filepath, 'r') as f:
    c = f.read()

# Fix: recipientUserId → recipientId, conversationId from response
old = """      authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId,
          content: 'Hello! I wanted to reach out.',
        }),
      })
        .then((r) => {
          if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Failed'); });
          return r.json();
        })
        .then((data) => {
          if (data.conversationId) {
            authFetch(`/api/messages?userId=${userId}`)
              .then((r) => r.json())
              .then((convData) => {
                if (convData.conversations) {
                  setConversations(convData.conversations);
                  const newConv = convData.conversations.find(
                    (c: Conversation) => c.id === data.conversationId,
                  );
                  if (newConv) handleSelectConversation(newConv);
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});"""

new = """      authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: recipientUserId,
          content: 'Hello! I wanted to reach out.',
        }),
      })
        .then((r) => {
          if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Failed'); });
          return r.json();
        })
        .then((data) => {
          if (data.conversationId) {
            // Close the new message dialog
            onNewMessageOpenChange?.(false);
            // Refresh conversations and select the new one
            authFetch(`/api/messages?userId=${userId}`)
              .then((r) => r.json())
              .then((convData) => {
                if (convData.conversations) {
                  setConversations(convData.conversations);
                  const newConv = convData.conversations.find(
                    (c: Conversation) => c.id === data.conversationId,
                  );
                  if (newConv) handleSelectConversation(newConv);
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});"""

if old in c:
    c = c.replace(old, new)
    print("  Fixed handleNewConversation")
else:
    print("  Pattern not found — checking alternative")
    # Try just fixing recipientUserId → recipientId
    c = c.replace("recipientUserId,
          content:", "recipientId: recipientUserId,
          content:")
    print("  Applied alternative fix")

with open(filepath, 'w') as f:
    f.write(c)
