#!/usr/bin/env python3
"""Fix: conversation.id should be conversationId (the variable, not the object)."""

filepath = '/root/gig-src/src/app/api/messages/route.ts'
with open(filepath, 'r') as f:
    c = f.read()

# In the existing-conversation path, `conversation` is not defined — 
# we use `conv` and `conversationId`. Fix the reference.
old1 = "message: JSON.stringify({ conversationId: conversation.id, senderId: userId }),"
new1 = "message: JSON.stringify({ conversationId: conversationId, senderId: userId }),"

# There are two occurrences — fix both
count = c.count(old1)
if count > 0:
    c = c.replace(old1, new1)
    print(f"Fixed {count} occurrence(s) of conversation.id -> conversationId")

with open(filepath, 'w') as f:
    f.write(c)
