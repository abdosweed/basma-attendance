# 🏛️ ARCHITECTURE.md - معماريّة النظام

## Stack Overview
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide Icons, Leaflet Maps.
- **Backend**: Next.js Serverless Route Handlers (/api/...).
- **Database**: PostgreSQL Hosted on Supabase Cloud, managed via Prisma ORM v5.22.0.
- **Realtime**: Hybrid Engine: Server-Sent Events (SSE) via `/api/notifications/stream` (15s Heartbeat Ping & Reconnect Backoff) + Smart Fallback Polling (30s) when SSE drops.
- **Security**: JWT Sessions (jose), bcrypt password hashing, Trusted Devices lock, Rate-Limited Auth, Cryptographic OTP Engine.

## System Architecture Diagram
`
[ PWA Mobile Client ] <---> [ Next.js Vercel Edge Serverless ] <---> [ Supabase PostgreSQL DB ]
                                     |
               [ SSE Realtime Stream + Smart Fallback Polling ]
`

