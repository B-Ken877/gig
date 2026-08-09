#!/usr/bin/env python3
"""Replace the ID verification banner with a compact popup modal."""

filepath = '/root/gig-src/src/components/portal/AgentDashboard.tsx'

with open(filepath, 'r') as f:
    c = f.read()

# ─── FIX 1: Add state for the popup dismissal ──────────────────────────────
old_state = "const [idVerificationStatus, setIdVerificationStatus] = useState<string>('unverified');"
new_state = "const [idVerificationStatus, setIdVerificationStatus] = useState<string>('unverified');\n  const [showVerifyPopup, setShowVerifyPopup] = useState(false);"
if old_state in c and 'showVerifyPopup' not in c:
    c = c.replace(old_state, new_state)
    print("Added showVerifyPopup state")

# ─── FIX 2: Auto-show the popup when verification status is loaded ──────────
old_set = "setIdVerificationStatus(me.idVerificationStatus || 'unverified');"
new_set = """setIdVerificationStatus(me.idVerificationStatus || 'unverified');
        // Auto-show the popup if not verified (and not previously dismissed this session)
        if ((me.idVerificationStatus || 'unverified') !== 'verified' && !sessionStorage.getItem('verifyPopupDismissed')) {
          setShowVerifyPopup(true);
        }"""
if old_set in c and 'showVerifyPopup' not in c.split('setIdVerificationStatus')[1][:200]:
    c = c.replace(old_set, new_set)
    print("Added auto-show popup logic")

# ─── FIX 3: Replace the big banner with a compact popup modal ──────────────
old_banner = """      {/* ID Verification Banner */}
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
      )}"""

new_popup = """      {/* ID Verification Popup Modal */}
      {showVerifyPopup && idVerificationStatus !== 'verified' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={() => { setShowVerifyPopup(false); sessionStorage.setItem('verifyPopupDismissed', '1'); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowVerifyPopup(false); sessionStorage.setItem('verifyPopupDismissed', '1'); }} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${idVerificationStatus === 'pending' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              {idVerificationStatus === 'pending' ? (
                <Clock className="h-7 w-7 text-amber-600" />
              ) : (
                <ShieldCheck className="h-7 w-7 text-blue-600" />
              )}
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {idVerificationStatus === 'pending' ? 'Verification Under Review' : 'Verify Your Identity'}
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              {idVerificationStatus === 'pending'
                ? 'Your ID is being reviewed. You\\'ll be notified within 1-2 business days.'
                : 'You must verify your identity to apply for jobs. It takes about 3 minutes.'
              }
            </p>
            {idVerificationStatus !== 'pending' && (
              <Button size="sm" className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90 mb-2" onClick={() => { setShowVerifyPopup(false); navigateTo('agent-verify-id' as never); }}>
                Verify Now <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
            <button onClick={() => { setShowVerifyPopup(false); sessionStorage.setItem('verifyPopupDismissed', '1'); }} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
              {idVerificationStatus === 'pending' ? 'Close' : 'Maybe Later'}
            </button>
          </div>
        </div>
      )}"""

if old_banner in c:
    c = c.replace(old_banner, new_popup)
    print("Replaced banner with popup modal")
else:
    print("Banner not found — may already be replaced or pattern differs")

# ─── FIX 4: Add X to imports ───────────────────────────────────────────────
if 'X' not in c.split('lucide-react')[1].split('}')[0]:
    old_imp = "  Briefcase, MapPin, Clock, CheckCircle2, DollarSign, ChevronRight, ShieldCheck,"
    new_imp = "  Briefcase, MapPin, Clock, CheckCircle2, DollarSign, ChevronRight, ShieldCheck, X,"
    if old_imp in c:
        c = c.replace(old_imp, new_imp)
        print("Added X to imports")

with open(filepath, 'w') as f:
    f.write(c)
