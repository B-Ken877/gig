#!/usr/bin/env python3
"""Fix: the new conversation path uses 'conversationId' variable which doesn't exist in that scope — should be 'conversation.id'."""

filepath = '/root/gig-src/src/app/api/messages/route.ts'
with open(filepath, 'r') as f:
    c = f.read()

# In the new conversation path, the variable is 'conversation' (from db.conversation.create)
# But the notification uses 'conversationId' which was destructured from the body
# and is likely null/undefined in the new conversation path.
# Fix: use conversation.id

# Find the second occurrence of the notification (new conversation path)
# It currently says: message: JSON.stringify({ conversationId: conversationId, senderId: userId }),
# But in this scope, 'conversationId' from the body is null (it's a new conversation).
# We need to use conversation.id instead.

# Replace only the second occurrence
old = """    try {
      await createNotification({
        userId: recipient,
        title: 'New Message',
        message: JSON.stringify({ conversationId: conversationId, senderId: userId }),
        type: 'message',
      });"""

new = """    try {
      await createNotification({
        userId: recipient,
        title: 'New Message',
        message: JSON.stringify({ conversationId: conversation.id, senderId: userId }),
        type: 'message',
      });"""

if old in c:
    c = c.replace(old, new)
    print("FIXED: new conversation path now uses conversation.id")
else:
    print("Pattern not found")

with open(filepath, 'w') as f:
    f.write(c)
