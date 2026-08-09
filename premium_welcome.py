#!/usr/bin/env python3
"""Premium welcome cards for both dashboards."""

# ─── AGENT DASHBOARD ───────────────────────────────────────────────────────
filepath_agent = '/root/gig-src/src/components/portal/AgentDashboard.tsx'
with open(filepath_agent, 'r') as f:
    c = f.read()

old_agent = """      <Card className="border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-[#0B1A2E] via-[#0f2540] to-[#16325a] px-6 py-5 text-white relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#16A34A]/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="relative flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 ring-2 ring-[#16A34A]/40 shadow-xl">
                  {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser?.name || 'User'} />}
                  <AvatarFallback className="bg-[#16A34A] text-white text-xl font-bold">
                    {(currentUser?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {idVerificationStatus === 'verified' && (
                  <span className="absolute -bottom-1 -right-1 bg-[#16A34A] rounded-full p-1 ring-2 ring-white">
                    <ShieldCheck className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{currentUser?.name?.split(' ')[0]}</h2>
                  {idVerificationStatus === 'verified' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/20 text-[#4ADE80] text-[10px] font-semibold uppercase tracking-wide">Verified</span>
                  )}
                </div>
                <p className="text-sm text-gray-300 mt-0.5">{agent?.country || 'Remote Agent'} {agent?.preferredShift ? '· ' + agent.preferredShift + ' Shift' : ''}</p>
                {agent?.languages?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <span className="opacity-60">Languages:</span> {agent.languages.join(', ')}
                  </p>
                )}
              </div>
            </div>
            {agent?.skills?.length > 0 && (
              <div className="relative flex flex-wrap gap-1.5 mt-4">
                {agent.skills.slice(0, 6).map((s: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium">{s}</span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>"""

new_agent = """      <Card className="border-0 overflow-hidden shadow-2xl shadow-[#0B1A2E]/20">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-[#0B1A2E] via-[#0d2240] to-[#0f2d52] px-6 py-6 text-white overflow-hidden">
            {/* Decorative gradient orbs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#16A34A]/15 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-[#16A34A]/8 rounded-full blur-2xl" />
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar with gradient ring */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-full blur-md opacity-50" />
                  <Avatar className="relative h-16 w-16 ring-2 ring-white/20 shadow-2xl">
                    {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser?.name || 'User'} />}
                    <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0F7B35] text-white text-xl font-bold">
                      {(currentUser?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {idVerificationStatus === 'verified' ? (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-[#16A34A] rounded-full p-1.5 ring-2 ring-[#0B1A2E] shadow-lg">
                      <ShieldCheck className="h-3.5 w-3.5 text-white" />
                    </span>
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-amber-500 rounded-full p-1.5 ring-2 ring-[#0B1A2E] shadow-lg">
                      <Clock className="h-3.5 w-3.5 text-white" />
                    </span>
                  )}
                </div>

                {/* Greeting + info */}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-[#4ADE80] uppercase tracking-wider mb-0.5">
                    {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold tracking-tight">{currentUser?.name?.split(' ')[0]}</h2>
                    {idVerificationStatus === 'verified' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16A34A]/20 border border-[#16A34A]/30 text-[#4ADE80] text-[10px] font-semibold uppercase tracking-wide">
                        <ShieldCheck className="h-2.5 w-2.5" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{agent?.country || 'Remote'}</span>
                    {agent?.preferredShift && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{agent.preferredShift}</span>}
                    {agent?.languages?.length > 0 && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{agent.languages.slice(0, 3).join(', ')}</span>}
                  </p>
                </div>
              </div>

              {/* Inline mini-stats */}
              <div className="hidden sm:flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-2xl font-bold text-white leading-none">{jobs.length}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Open Jobs</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#4ADE80] leading-none">{appliedIds.size}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Applied</p>
                </div>
              </div>
            </div>

            {/* Skills */}
            {agent?.skills?.length > 0 && (
              <div className="relative flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-white/5">
                {agent.skills.slice(0, 8).map((s: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-gray-300 hover:bg-white/10 transition-colors">{s}</span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>"""

if old_agent in c:
    c = c.replace(old_agent, new_agent)
    print("Agent: premium welcome card applied")
else:
    print("Agent: pattern not found")

# Add Globe import if missing
if 'Globe' not in c.split('lucide-react')[1].split('}')[0]:
    old_imp = "  TrendingUp, CalendarClock,"
    new_imp = "  TrendingUp, CalendarClock, Globe,"
    if old_imp in c:
        c = c.replace(old_imp, new_imp)
        print("Agent: added Globe import")

with open(filepath_agent, 'w') as f:
    f.write(c)

# ─── ADMIN DASHBOARD ───────────────────────────────────────────────────────
filepath_admin = '/root/gig-src/src/components/portal/AdminDashboard.tsx'
with open(filepath_admin, 'r') as f:
    c = f.read()

old_admin = """      <Card className="border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-[#0B1A2E] via-[#0f2540] to-[#16325a] px-6 py-5 text-white relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#16A34A]/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="relative flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-[#16A34A]/40 shadow-xl">
                  {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser?.name || 'User'} />}
                  <AvatarFallback className="bg-[#16A34A] text-white text-lg font-bold">
                    {(currentUser?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 bg-[#16A34A] rounded-full p-1 ring-2 ring-white">
                  <ShieldCheck className="h-3.5 w-3.5 text-white" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{currentUser?.name?.split(' ')[0]}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/20 text-[#4ADE80] text-[10px] font-semibold uppercase tracking-wide">Admin</span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5">Platform Overview · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>"""

new_admin = """      <Card className="border-0 overflow-hidden shadow-2xl shadow-[#0B1A2E]/20">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-[#0B1A2E] via-[#0d2240] to-[#0f2d52] px-6 py-6 text-white overflow-hidden">
            {/* Decorative gradient orbs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#16A34A]/15 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-[#16A34A]/8 rounded-full blur-2xl" />
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar with gradient ring */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-full blur-md opacity-50" />
                  <Avatar className="relative h-14 w-14 ring-2 ring-white/20 shadow-2xl">
                    {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser?.name || 'User'} />}
                    <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0F7B35] text-white text-lg font-bold">
                      {(currentUser?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 bg-[#16A34A] rounded-full p-1.5 ring-2 ring-[#0B1A2E] shadow-lg">
                    <ShieldCheck className="h-3.5 w-3.5 text-white" />
                  </span>
                </div>

                {/* Greeting + info */}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-[#4ADE80] uppercase tracking-wider mb-0.5">
                    {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold tracking-tight">{currentUser?.name?.split(' ')[0]}</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16A34A]/20 border border-[#16A34A]/30 text-[#4ADE80] text-[10px] font-semibold uppercase tracking-wide">
                      <ShieldCheck className="h-2.5 w-2.5" /> Admin
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · Platform Control Center
                  </p>
                </div>
              </div>

              {/* Inline mini-stats */}
              {stats && (
                <div className="hidden sm:flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white leading-none">{stats.activeJobs}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Active Jobs</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#4ADE80] leading-none">{stats.totalAgents}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Agents</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-400 leading-none">{stats.pendingApplications}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Pending</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>"""

if old_admin in c:
    c = c.replace(old_admin, new_admin)
    print("Admin: premium welcome card applied")
else:
    print("Admin: pattern not found")

with open(filepath_admin, 'w') as f:
    f.write(c)
