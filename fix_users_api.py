#!/usr/bin/env python3
"""Fix the users API to exclude admin accounts server-side."""
filepath = '/root/gig-src/src/app/api/users/route.ts'

with open(filepath, 'r') as f:
    c = f.read()

# Replace the where clause to always exclude admin/payment_taker
old = "const where: Record<string, unknown> = {};\n    if (role) where.role = role;"
new = "const where: Record<string, unknown> = { role: { notIn: ['admin', 'payment_taker'] } };\n    if (role && role !== 'admin' && role !== 'payment_taker') where.role = role;"

if old in c:
    c = c.replace(old, new)
    print("Fixed: now excludes admin/payment_taker by default")
else:
    print("Pattern not found — may already be fixed or different format")
    # Show the surrounding code for debugging
    import re
    match = re.search(r'const where.*?role.*?;', c, re.DOTALL)
    if match:
        print(f"Found: {match.group()[:200]}")

with open(filepath, 'w') as f:
    f.write(c)
