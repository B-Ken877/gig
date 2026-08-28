#!/usr/bin/env python3
"""Add ID verification fields to the Agent model in the Prisma schema."""
filepath = '/root/gig-src/prisma/schema.prisma'

with open(filepath, 'r') as f:
    c = f.read()

# Add ID verification fields after the niu field in the Agent model.
old = "  niu             String?\n  createdAt       DateTime @default(now())\n  updatedAt       DateTime @updatedAt\n\n  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)"

new = """  niu             String?
  // ─── Identity Verification ────────────────────────────────────────────
  // Status: 'unverified' | 'pending' | 'verified' | 'rejected'
  // type:   'id_card' | 'drivers_license'
  idVerificationStatus String  @default("unverified")
  idVerificationType   String?
  idFrontPhotoUrl      String?
  idBackPhotoUrl       String?
  idSelfiePhotoUrl     String?
  idVerificationSubmittedAt DateTime?
  idVerificationReviewedAt  DateTime?
  idVerificationReviewedBy  String?
  idVerificationNotes       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)"""

if old in c:
    c = c.replace(old, new)
    print("Added ID verification fields to Agent model")
else:
    print("Pattern not found — may already be added or schema changed")
    # Check if already added
    if 'idVerificationStatus' in c:
        print("  (idVerificationStatus already exists)")

with open(filepath, 'w') as f:
    f.write(c)
