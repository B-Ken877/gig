#!/usr/bin/env python3
"""Fix AdminDashboard missing imports — Avatar, AvatarImage, AvatarFallback, ShieldCheck."""

filepath = '/root/gig-src/src/components/portal/AdminDashboard.tsx'
with open(filepath, 'r') as f:
    c = f.read()

# 1. Add ShieldCheck to lucide-react imports
old_imp = "  AlertCircle, RefreshCw, CheckCircle2, Clock, Network, CalendarClock,"
new_imp = "  AlertCircle, RefreshCw, CheckCircle2, Clock, Network, CalendarClock, ShieldCheck,"
if 'ShieldCheck' not in c.split('lucide-react')[1].split('}')[0]:
    c = c.replace(old_imp, new_imp)
    print("Added ShieldCheck to lucide-react imports")
else:
    print("ShieldCheck already in lucide imports")

# 2. Add Avatar imports
old_btn = "import { Button } from '@/components/ui/button';"
new_btn = "import { Button } from '@/components/ui/button';\nimport { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';"
if '@/components/ui/avatar' not in c:
    c = c.replace(old_btn, new_btn)
    print("Added Avatar imports")
else:
    print("Avatar already imported")

with open(filepath, 'w') as f:
    f.write(c)
print("Done")
