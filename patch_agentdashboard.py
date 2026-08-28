#!/usr/bin/env python3
"""Patch AgentDashboard to add an ID verification banner."""
filepath = '/root/gig-src/src/components/portal/AgentDashboard.tsx'

with open(filepath, 'r') as f:
    c = f.read()

# Add idVerificationStatus to agent state
old_state = "const [salaryDates, setSalaryDates] = useState<any[]>([]);"
new_state = "const [salaryDates, setSalaryDates] = useState<any[]>([]);\n  const [idVerificationStatus, setIdVerificationStatus] = useState<string>('unverified');"
if old_state in c and 'idVerificationStatus' not in c:
    c = c.replace(old_state, new_state)
    print("Added idVerificationStatus state")

# Add fetch of verification status after agent is loaded
old_fetch = "setSalaryDates(salaryRes2.salaryDates || []);"
new_fetch = "setSalaryDates(salaryRes2.salaryDates || []);\n        setIdVerificationStatus(me.idVerificationStatus || 'unverified');"
if old_fetch in c and 'setIdVerificationStatus' not in c:
    c = c.replace(old_fetch, new_fetch)
    print("Added verification status fetch")

# Add the verification banner — insert it right after the welcome card
# Find the closing of the welcome card and insert the banner after it
old_welcome_end = """        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">"""

new_welcome_end = """        </CardContent>
      </Card>

      {/* ID Verification Banner */}
      {idVerificationStatus !== 'verified' && (
        <Card className={idVerificationStatus === 'pending' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/50'}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${idVerificationStatus === 'pending' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                {idVerificationStatus === 'pending' ? (
                  <Clock className="h-6 w-6 text-amber-600" />
                ) : (
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">
                  {idVerificationStatus === 'pending' ? 'ID Verification Under Review' : 'Verify Your Identity'}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {idVerificationStatus === 'pending'
                    ? 'Your ID verification is being reviewed. We\\'ll notify you within 1-2 business days.'
                    : 'All agents must verify their identity to apply for jobs. It takes about 3 minutes.'
                  }
                </p>
              </div>
              {idVerificationStatus !== 'pending' && (
                <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90 shrink-0" onClick={() => navigateTo('agent-verify-id' as never)}>
                  Verify Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">"""

if old_welcome_end in c and 'ID Verification Banner' not in c:
    c = c.replace(old_welcome_end, new_welcome_end)
    print("Added ID verification banner")

# Add imports for Clock and ShieldCheck
if 'Clock' not in c.split('lucide-react')[1].split('}')[0]:
    old_imp = "  ChevronRight,"
    new_imp = "  ChevronRight, Clock, ShieldCheck,"
    if old_imp in c:
        c = c.replace(old_imp, new_imp)
        print("Added Clock + ShieldCheck imports")

with open(filepath, 'w') as f:
    f.write(c)
