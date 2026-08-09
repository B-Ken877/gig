#!/usr/bin/env python3
"""Fix AdminDashboard stat cards — direct replacement."""
filepath = '/root/gig-src/src/components/portal/AdminDashboard.tsx'

with open(filepath, 'r') as f:
    c = f.read()

# Replace the grid wrapper + card content
old = """      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

new = """      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

if old in c:
    c = c.replace(old, new)
    print("AdminDashboard: updated stat cards to 2/4-per-row compact")
else:
    print("Pattern not found")

with open(filepath, 'w') as f:
    f.write(c)
