# 🏛️ ARCHITECTURE.md - معماريّة النظام

## Stack Overview
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide Icons, Leaflet Maps.
- **Backend**: Next.js Serverless Route Handlers (/api/...).
- **Database**: PostgreSQL Hosted on Supabase Cloud, managed via Prisma ORM v5.22.0.
- **Realtime**: Server-Sent Events (SSE) stream via /api/notifications/stream.
- **Security**: JWT Sessions (jose), bcrypt password hashing, Trusted Devices lock, Rate-Limited Auth.

## System Architecture Diagram
`
[ PWA Mobile Client ] <---> [ Next.js Vercel Edge Serverless ] <---> [ Supabase PostgreSQL DB ]
                                     |
                          [ SSE Realtime Stream ]
`

