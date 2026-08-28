#!/usr/bin/env python3
"""Fix the UserProfileModal fetch to also get agent data."""

filepath = '/root/gig-src/src/components/ui/user-profile-modal.tsx'
with open(filepath, 'r') as f:
    c = f.read()

old = """    authFetch('/api/users/' + userId)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load profile');
        return r.json();
      })
      .then(data => setProfile(data.user || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));"""

new = """    authFetch('/api/users/' + userId)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load profile');
        return r.json();
      })
      .then(async data => {
        let profileData = data.user || null;
        // If the user is an agent, also fetch their agent profile
        // (skills, languages, experience, country, etc.)
        if (profileData && profileData.role === 'agent') {
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
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));"""

if old in c:
    c = c.replace(old, new)
    print("FIXED: UserProfileModal now fetches agent data")
else:
    print("Pattern not found")

with open(filepath, 'w') as f:
    f.write(c)
