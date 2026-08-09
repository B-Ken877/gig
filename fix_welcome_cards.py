#!/usr/bin/env python3
"""Make the welcome cards more professional on both dashboards."""

# ─── Agent Dashboard welcome card ──────────────────────────────────────────
filepath_agent = '/root/gig-src/src/components/portal/AgentDashboard.tsx'
with open(filepath_agent, 'r') as f:
    c = f.read()

old_agent = """      <Card className="bg-gradient-to-r from-[#0B1A2E] to-[#1a2d4a] border-0">
        <CardContent className="p-6 text-white">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-white/20 shadow-lg">
              {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser?.name || 'User'} />}
              <AvatarFallback className="bg-[#16A34A] text-white text-lg font-bold">
                {(currentUser?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">Welcome back, {currentUser?.name?.split(' ')[0]}!</h2>
              <p className="text-sm text-gray-300 mt-1">Browse open positions below. Apply with a video assessment.</p>
            </div>
          </div>
          {agent?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {agent.skills.slice(0, 6).map((s: string, i: number) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-medium">{s}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>"""

new_agent = """      <Card className="border-0 overflow-hidden">
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

if old_agent in c:
    c = c.replace(old_agent, new_agent)
    print("Agent: welcome card updated")
else:
    print("Agent: pattern not found")

with open(filepath_agent, 'w') as f:
    f.write(c)

# ─── Admin Dashboard welcome card ──────────────────────────────────────────
filepath_admin = '/root/gig-src/src/components/portal/AdminDashboard.tsx'
with open(filepath_admin, 'r') as f:
    c = f.read()

old_admin = """      <Card className="bg-gradient-to-r from-[#0B1A2E] to-[#1a2d4a] border-0">
        <CardContent className="p-6 text-white">
          <h2 className="text-xl font-bold">Welcome back, {currentUser?.name?.split(' ')[0]}!</h2>
          <p className="text-sm text-gray-300 mt-1">Here&apos;s what&apos;s happening on the platform today.</p>
        </CardContent>
      </Card>"""

new_admin = """      <Card className="border-0 overflow-hidden">
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

if old_admin in c:
    c = c.replace(old_admin, new_admin)
    print("Admin: welcome card updated")
else:
    print("Admin: pattern not found")

# Make sure AdminDashboard imports Avatar + ShieldCheck
if 'Avatar' not in c.split('lucide-react')[1].split('}')[0]:
    # Add imports
    old_imp = "import { LayoutDashboard, User, FileText, Calendar, ArrowLeft, Bell, LogOut, Menu, X,"
    new_imp = "import { LayoutDashboard, User, FileText, Calendar, ArrowLeft, Bell, LogOut, Menu, X,"
    # Avatar is from @/components/ui/avatar, not lucide-react
    if "@/components/ui/avatar" not in c:
        # Add the import after the Button import
        old_btn = "import { Button } from '@/components/ui/button';"
        new_btn = "import { Button } from '@/components/ui/button';\nimport { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';"
        if old_btn in c and 'Avatar' not in c:
            c = c.replace(old_btn, new_btn)
            print("Admin: added Avatar import")

    if 'ShieldCheck' not in c.split('lucide-react')[1].split('}')[0]:
        old_sc = "  TrendingUp,"
        new_sc = "  TrendingUp, ShieldCheck,"
        if old_sc in c:
            c = c.replace(old_sc, new_sc)
            print("Admin: added ShieldCheck import")

with open(filepath_admin, 'w') as f:
    f.write(c)
