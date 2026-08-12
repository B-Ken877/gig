# Database Backups

Automated daily backups of the Gig Solutions SQLite database.

**⚠️ SECURITY: Contains sensitive user data. This repo MUST stay private.**

## Latest backup
- Date: August 12, 2026 at 01:17 PM
- File: db/custom.db
- Size: 520K

## To restore
1. Download db/custom.db from this branch
2. Upload to server at /root/gig/db/custom.db
3. Restart: pm2 restart gig-solutions
