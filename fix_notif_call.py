#!/usr/bin/env python3
"""Fix the notification call — createNotification expects { userId, title, message } as a single object."""

filepath = '/root/gig-src/src/app/api/messages/route.ts'
with open(filepath, 'r') as f:
    c = f.read()

# Fix notification call 1 (existing conversation)
old1 = """      try {
        await createNotification(recipientIdForNotif, {
          title: 'New Message',
          message: JSON.stringify({ conversationId: conversation.id, senderId: userId }),
          type: 'message',
        });"""
new1 = """      try {
        await createNotification({
          userId: recipientIdForNotif,
          title: 'New Message',
          message: JSON.stringify({ conversationId: conversation.id, senderId: userId }),
          type: 'message',
        });"""
if old1 in c:
    c = c.replace(old1, new1)
    print("FIX 1: notification call 1 fixed")
else:
    print("FIX 1: pattern not found")

# Fix notification call 2 (new conversation)
old2 = """    try {
      await createNotification(recipient, {
        title: 'New Message',
        message: JSON.stringify({ conversationId: conversation.id, senderId: userId }),
        type: 'message',
      });"""
new2 = """    try {
      await createNotification({
        userId: recipient,
        title: 'New Message',
        message: JSON.stringify({ conversationId: conversation.id, senderId: userId }),
        type: 'message',
      });"""
if old2 in c:
    c = c.replace(old2, new2)
    print("FIX 2: notification call 2 fixed")
else:
    print("FIX 2: pattern not found")

with open(filepath, 'w') as f:
    f.write(c)
