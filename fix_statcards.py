#!/usr/bin/env python3
"""Make the stat cards (Open Jobs, Applications, etc.) compact and 4-per-row."""

# Patch AgentDashboard
filepath_agent = '/root/gig-src/src/components/portal/AgentDashboard.tsx'
with open(filepath_agent, 'r') as f:
    c = f.read()

old_agent = """      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-dashboard' as never)}>
          <CardContent className="p-5"><div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Open Jobs</p><p className="text-2xl font-bold mt-1">{jobs.length}</p></div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center"><Briefcase className="h-5 w-5 text-blue-600" /></div>
          </div></CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-applications' as never)}>
          <CardContent className="p-5"><div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Applications</p><p className="text-2xl font-bold mt-1">{appliedIds.size}</p></div>
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
          </div></CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-my-work' as never)}>
          <CardContent className="p-5"><div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Active Work</p><p className="text-2xl font-bold mt-1">{activePlacements.length}</p></div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-purple-600" /></div>
          </div></CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('messages' as never)}>
          <CardContent className="p-5"><div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Unread Messages</p><p className="text-2xl font-bold mt-1">{unreadMsgs}</p></div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center"><MessageCircle className="h-5 w-5 text-amber-600" /></div>
          </div></CardContent>
        </Card>
      </div>"""

new_agent = """      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-dashboard' as never)}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Briefcase className="h-4 w-4 text-blue-600" /></div>
            <div className="min-w-0"><p className="text-[10px] text-gray-500">Open Jobs</p><p className="text-lg font-bold leading-tight">{jobs.length}</p></div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-applications' as never)}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
            <div className="min-w-0"><p className="text-[10px] text-gray-500">Applications</p><p className="text-lg font-bold leading-tight">{appliedIds.size}</p></div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('agent-my-work' as never)}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0"><TrendingUp className="h-4 w-4 text-purple-600" /></div>
            <div className="min-w-0"><p className="text-[10px] text-gray-500">Active Work</p><p className="text-lg font-bold leading-tight">{activePlacements.length}</p></div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('messages' as never)}>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0"><MessageCircle className="h-4 w-4 text-amber-600" /></div>
            <div className="min-w-0"><p className="text-[10px] text-gray-500">Unread Messages</p><p className="text-lg font-bold leading-tight">{unreadMsgs}</p></div>
          </CardContent>
        </Card>
      </div>"""

if old_agent in c:
    c = c.replace(old_agent, new_agent)
    print("AgentDashboard: updated stat cards to 2/4-per-row compact")
else:
    print("AgentDashboard: pattern not found")

with open(filepath_agent, 'w') as f:
    f.write(c)

# Patch AdminDashboard
filepath_admin = '/root/gig-src/src/components/portal/AdminDashboard.tsx'
with open(filepath_admin, 'r') as f:
    c = f.read()

old_admin = """        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {cards.map(c => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(c.page)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{c.label}</p>
                      <p className="text-2xl font-bold mt-1">
                        {c.value}
                        {c.total != null && c.total !== c.value && (
                          <span className="text-sm text-gray-400 font-normal"> / {c.total}</span>
                        )}
                      </p>
                    </div>
                    <div className={`h-10 w-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${c.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>"""

new_admin = """        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map(c => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(c.page)}>
                <CardContent className="p-3 flex items-center gap-2">
                  <div className={`h-9 w-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${c.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500">{c.label}</p>
                    <p className="text-lg font-bold leading-tight">
                      {c.value}
                      {c.total != null && c.total !== c.value && (
                        <span className="text-xs text-gray-400 font-normal"> / {c.total}</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>"""

if old_admin in c:
    c = c.replace(old_admin, new_admin)
    print("AdminDashboard: updated stat cards to 2/4-per-row compact")
else:
    print("AdminDashboard: pattern not found")

with open(filepath_admin, 'w') as f:
    f.write(c)
