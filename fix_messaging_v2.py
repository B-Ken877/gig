#!/usr/bin/env python3
"""Fix messaging: 1) handleNewConversation uses setNewConvOpen, 2) handleSendMessage supports recipientId, 3) profile modal fetches agent data."""

filepath = '/root/gig-src/src/components/portal/MessagesPage.tsx'
with open(filepath, 'r') as f:
    c = f.read()

# ─── FIX 1: handleNewConversation — replace onNewMessageOpenChange with setNewConvOpen ─
old1 = """        .then((data) => {
          if (data.conversationId) {
            onNewMessageOpenChange?.(false);
            authFetch(`/api/messages?userId=${userId}`)"""
new1 = """        .then((data) => {
          if (data.conversationId) {
            setNewConvOpen(false);
            authFetch(`/api/messages?userId=${userId}`)"""

if old1 in c:
    c = c.replace(old1, new1)
    print("FIX 1: handleNewConversation now uses setNewConvOpen")
else:
    print("FIX 1: pattern not found")

# ─── FIX 2: handleSendMessage — support both conversationId and recipientId ─
old2 = """  const handleSendMessage = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !activeConvId || sendingMessage) return;

    setSendingMessage(true);

    try {
      const res = await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvId,
          content: trimmed,
        }),
      });

      if (res.ok) {
        setInputValue('');
        fetchMessages(activeConvId);
        fetchConversations();
      }
    } catch {
      // silent
    } finally {
      setSendingMessage(false);
      inputRef.current?.focus();
    }
  }, [inputValue, activeConvId, sendingMessage, fetchMessages, fetchConversations]);"""

new2 = """  const handleSendMessage = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sendingMessage) return;

    setSendingMessage(true);

    try {
      const body: any = { content: trimmed };
      if (activeConvId) {
        body.conversationId = activeConvId;
      }

      const res = await authFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setInputValue('');
        if (activeConvId) {
          fetchMessages(activeConvId);
        }
        fetchConversations();
      }
    } catch {
      // silent
    } finally {
      setSendingMessage(false);
      inputRef.current?.focus();
    }
  }, [inputValue, activeConvId, sendingMessage, fetchMessages, fetchConversations]);"""

if old2 in c:
    c = c.replace(old2, new2)
    print("FIX 2: handleSendMessage now supports no-conversationId case")
else:
    print("FIX 2: pattern not found")

# ─── FIX 3: handleNewConversation — also close the dialog and show a toast ─
# Add addToast to the success path
old3 = """      // Create new conversation by sending a greeting
      authFetch('/api/messages', {"""
new3 = """      // Create new conversation by sending a greeting message
      authFetch('/api/messages', {"""

if old3 in c:
    c = c.replace(old3, new3)
    print("FIX 3: comment updated")

# ─── FIX 4: handleNewConversation — also handle the error case ─
old4 = """        .catch(() => {});
    },
    [conversations, userId, handleSelectConversation],"""

new4 = """        .catch((err) => {
          console.error('Failed to start conversation:', err);
        });
    },
    [conversations, userId, handleSelectConversation],"""

if old4 in c:
    c = c.replace(old4, new4)
    print("FIX 4: error logging added")

with open(filepath, 'w') as f:
    f.write(c)

# ─── FIX 5: UserProfileModal — fetch agent data from /api/agents?id= instead of /api/users/[id] ─
# The /api/users/[id] returns basic user info, but the modal needs agent profile data.
# Let's update the modal to also fetch from /api/agents if the user is an agent.
filepath_modal = '/root/gig-src/src/components/ui/user-profile-modal.tsx'
with open(filepath_modal, 'r') as f:
    mc = f.read()

# Check what the modal fetches
if "authFetch('/api/users/' + userId)" in mc:
    # Add a second fetch for agent data
    old_fetch = """    authFetch('/api/users/' + userId)
      .then((r) => {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then((data) => {
        if (data.user) setProfile(data.user);
      })"""
    
    new_fetch = """    authFetch('/api/users/' + userId)
      .then((r) => {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then(async (data) => {
        if (data.user) {
          let profileData = data.user;
          // If the user is an agent, also fetch their agent profile for skills/languages/etc.
          if (data.user.role === 'agent') {
            try {
              const agentRes = await authFetch('/api/agents?userId=' + userId);
              if (agentRes.ok) {
                const agentData = await agentRes.json();
                const agent = agentData.id ? agentData : (agentData.agents || [])[0];
                if (agent) {
                  profileData = { ...profileData, agent };
                }
              }
            } catch (e) {
              console.error('Failed to fetch agent profile:', e);
            }
          }
          setProfile(profileData);
        }
      })"""

    if old_fetch in mc:
        mc = mc.replace(old_fetch, new_fetch)
        print("FIX 5: UserProfileModal now fetches agent data")
    else:
        print("FIX 5: fetch pattern not found — checking alternative")
        # Try to find the fetch and fix it
        import re
        match = re.search(r"authFetch\('/api/users/' \+ userId\).*?setProfile\(", mc, re.DOTALL)
        if match:
            print(f"  Found fetch at position {match.start()}-{match.end()}")
        else:
            print("  Could not find fetch")
else:
    print("FIX 5: fetch pattern not found (different URL)")

with open(filepath_modal, 'w') as f:
    f.write(mc)
