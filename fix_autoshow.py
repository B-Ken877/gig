#!/usr/bin/env python3
"""Add setIdVerificationStatus call + auto-show popup to loadData."""
filepath = '/root/gig-src/src/components/portal/AgentDashboard.tsx'

with open(filepath, 'r') as f:
    c = f.read()

old = "        setSalaryDates(salaryRes2.salaryDates || []);"
new = """        setSalaryDates(salaryRes2.salaryDates || []);
        setIdVerificationStatus(me.idVerificationStatus || 'unverified');
        if ((me.idVerificationStatus || 'unverified') !== 'verified' && !sessionStorage.getItem('verifyPopupDismissed')) {
          setShowVerifyPopup(true);
        }"""

if old in c and 'setIdVerificationStatus(me' not in c:
    c = c.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(c)
    print("FIXED: added setIdVerificationStatus call + auto-show popup")
elif 'setIdVerificationStatus(me' in c:
    print("Already fixed")
else:
    print("Pattern not found")
