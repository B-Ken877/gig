#!/usr/bin/env python3
"""Fix MessagesPage: change recipientUserId to recipientId in the POST body."""
filepath = '/root/gig-src/src/components/portal/MessagesPage.tsx'
with open(filepath, 'r') as f:
    c = f.read()

old = """        body: JSON.stringify({
          recipientUserId,
          content: 'Hello! I wanted to reach out.',
        }),"""

new = """        body: JSON.stringify({
          recipientId: recipientUserId,
          content: 'Hello! I wanted to reach out.',
        }),"""

if old in c:
    c = c.replace(old, new)
    print("FIXED: recipientUserId -> recipientId")
else:
    print("Pattern not found")

# Also fix: close the dialog after starting a new conversation
old2 = """        .then((data) => {
          if (data.conversationId) {
            authFetch(`/api/messages?userId=${userId}`)"""

new2 = """        .then((data) => {
          if (data.conversationId) {
            onNewMessageOpenChange?.(false);
            authFetch(`/api/messages?userId=${userId}`)"""

if old2 in c and 'onNewMessageOpenChange?.(false)' not in c:
    c = c.replace(old2, new2)
    print("FIXED: close dialog after new conversation")

with open(filepath, 'w') as f:
    f.write(c)
