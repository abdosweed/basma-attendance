# 🚀 DEPLOYMENT.md - دليل النشر وتتبع الهجرة

## Environment Variables (.env)
- `DATABASE_URL`: Supabase PostgreSQL pooled connection URL.
- `DIRECT_URL`: Supabase direct PostgreSQL URL.
- `JWT_SECRET`: High-entropy secret key for JWT signing.

## Official Database Migration Workflow (Prisma Migrate)
1. **Development Schema Modification**:
   - Edit `prisma/schema.prisma`.
   - Run local migration: `npx prisma migrate dev --name <migration_name>`
2. **Review DDL Script**:
   - Inspect generated `prisma/migrations/<timestamp>_<migration_name>/migration.sql`.
3. **Production Deployment**:
   - Execute production migrations: `npx prisma migrate deploy`
   - Verify status: `npx prisma migrate status`
4. **Vercel Build & Deploy**:
   - Run `npx tsc --noEmit`
   - Deploy to Vercel: `npx vercel --prod --yes`

> [!CAUTION]
> Do NOT use `prisma db push` or `prisma migrate reset` on Production databases!
