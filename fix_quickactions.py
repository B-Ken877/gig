#!/usr/bin/env python3
"""Make quick action buttons more compact (icon + text side-by-side) and ensure 3-per-row."""

# Patch AgentDashboard
filepath_agent = '/root/gig-src/src/components/portal/AgentDashboard.tsx'
with open(filepath_agent, 'r') as f:
    c = f.read()

old_agent = """      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map(a => {
          const Icon = a.icon;
          return (
            <Card key={a.page} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(a.page)}>
              <CardContent className="p-5">
                <div className={"h-10 w-10 rounded-lg " + a.bg + " flex items-center justify-center mb-3"}>
                  <Icon className={"h-5 w-5 " + a.color} />
                </div>
                <h3 className="text-sm font-semibold">{a.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{a.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>"""

new_agent = """      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        {quickActions.map(a => {
          const Icon = a.icon;
          return (
            <Card key={a.page} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(a.page)}>
              <CardContent className="p-3 flex flex-col items-center text-center">
                <div className={"h-10 w-10 rounded-lg " + a.bg + " flex items-center justify-center mb-2"}>
                  <Icon className={"h-5 w-5 " + a.color} />
                </div>
                <h3 className="text-xs font-semibold">{a.label}</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">{a.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>"""

if old_agent in c:
    c = c.replace(old_agent, new_agent)
    print("AgentDashboard: updated quick actions to 3-per-row compact cards")
else:
    print("AgentDashboard: pattern not found")

with open(filepath_agent, 'w') as f:
    f.write(c)

# Patch AdminDashboard
filepath_admin = '/root/gig-src/src/components/portal/AdminDashboard.tsx'
with open(filepath_admin, 'r') as f:
    c = f.read()

old_admin = """      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <Card key={a.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(a.page)}>
                <CardContent className="p-5">
                  <div className={`h-10 w-10 rounded-lg ${a.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`h-5 w-5 ${a.color}`} />
                  </div>
                  <h3 className="text-sm font-semibold">{a.label}</h3>
                  <p className="text-xs text-gray-500 mt-1">{a.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>"""

new_admin = """      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <Card key={a.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo(a.page)}>
                <CardContent className="p-3 flex flex-col items-center text-center">
                  <div className={`h-10 w-10 rounded-lg ${a.bg} flex items-center justify-center mb-2`}>
                    <Icon className={`h-5 w-5 ${a.color}`} />
                  </div>
                  <h3 className="text-xs font-semibold">{a.label}</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">{a.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>"""

if old_admin in c:
    c = c.replace(old_admin, new_admin)
    print("AdminDashboard: updated quick actions to 4-per-row compact cards")
else:
    print("AdminDashboard: pattern not found")

with open(filepath_admin, 'w') as f:
    f.write(c)
