# Grand Sangamam AI Chatbot — Complete Documentation

## Table of Contents
1. [Project Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Environment Variables](#environment-variables)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Deployment Guide](#deployment-guide)
8. [Admin Dashboard Guide](#admin-dashboard)
9. [Troubleshooting](#troubleshooting)
10. [Backup & Restore](#backup--restore)
11. [Maintenance](#maintenance)

---

## 1. Project Overview

**Grand Sangamam AI Chatbot** is a full-stack production-ready system that provides:

- 🤖 **AI-powered floating chatbot** on the Grand Sangamam website
- 🔍 **Website knowledge base** built by crawling tamilpreneur.in/grand-sangamam
- 📞 **Automatic outbound calling** via Twilio + ElevenLabs voice AI
- 🎙️ **Call recording & transcription** storage
- 📊 **Admin dashboard** with real-time analytics
- 🔒 **JWT-protected admin panel** with audit logging

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend Chatbot | React 18 + Vite + TailwindCSS |
| Admin Dashboard | React 18 + Vite + Recharts + TailwindCSS |
| Backend API | Node.js + Express + Socket.IO |
| Database | PostgreSQL + Prisma ORM |
| AI Engine | Google Gemini 2.0 Flash (RAG) |
| Voice Calling | Twilio Voice API |
| Voice AI Agent | ElevenLabs Conversational AI |
| Deployment | Docker + Nginx + PM2 |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Grand Sangamam Website                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Floating Chat Widget (React)            │   │
│  │  • Suggested questions  • Streaming responses        │   │
│  │  • Lead form (phone)    • Dark mode                 │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP + SSE + WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express Backend (Node.js)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Chat API    │  │  Lead API    │  │   Admin API      │  │
│  │  (SSE/stream)│  │  (+ auto-call│  │   (JWT-auth)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
│         │                  │                                  │
│  ┌──────▼───────┐  ┌───────▼──────────────────────────────┐ │
│  │  Gemini AI   │  │           Twilio Service              │ │
│  │  (RAG+Embed) │  │  initiateCall() → TwiML → ElevenLabs │ │
│  └──────┬───────┘  └───────────────────────────────────────┘ │
│         │                                                     │
│  ┌──────▼───────────────────────────────────────────────────┐ │
│  │              PostgreSQL (via Prisma ORM)                 │ │
│  │  Sessions │ Messages │ Leads │ Calls │ Knowledge │ FAQs  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          │ WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Admin Dashboard (Separate React App)            │
│  Dashboard │ Conversations │ Leads │ Calls │ Analytics      │
│  Knowledge Base │ Settings │ Admin Users                    │
└─────────────────────────────────────────────────────────────┘
```

### Call Flow
```
User submits phone number
        │
        ▼
Lead saved to DB ──────────────────► WebSocket event to Admin
        │
        ▼ (2 second delay)
Twilio.calls.create(phone)
        │
        ▼
Twilio calls the user
        │
        ▼
TwiML: Connect → ElevenLabs WebSocket Stream
        │
        ▼
ElevenLabs AI Agent greets user with website knowledge
        │
        ├─► Full call recorded
        │
        ▼
Recording webhook ──► stored in DB ──► Admin dashboard updated
        │
        ▼ (if failed)
Retry once after 10 seconds
        │
        ▼ (if still failed)
Mark lead as "Call Failed"
```

---

## 3. Installation

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn
- Docker & Docker Compose (for production)

### Development Setup

```bash
# 1. Clone and enter project
git clone <your-repo> grand-sangamam
cd grand-sangamam

# 2. Backend setup
cd backend
cp .env.example .env
# Edit .env with your API keys

npm install
npx prisma migrate dev --name init
npm run seed    # Creates admin: admin / Admin@2026
npm run dev     # Starts on :5000

# 3. Frontend chatbot (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev     # Starts on :5173

# 4. Admin dashboard (new terminal)
cd admin
cp .env.example .env
npm install
npm run dev     # Starts on :5174
```

### First-Time Setup
1. Open admin: `http://localhost:5174/admin/login`
2. Login: `admin` / `Admin@2026` (change immediately!)
3. Go to **Settings** → add your Gemini, Twilio, ElevenLabs keys
4. Go to **Knowledge Base** → click **Re-index Website**
5. Wait for crawl to complete (check terminal logs)
6. Test chatbot at `http://localhost:5173`

---

## 4. Environment Variables

### Backend `.env`

```env
# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
ADMIN_URL=https://admin.yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/grand_sangamam

# JWT (generate a strong random string — 64+ chars)
JWT_SECRET=your_very_long_random_secret_key_here
JWT_EXPIRES_IN=7d

# Gemini AI (https://aistudio.google.com)
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash-exp

# Twilio (https://console.twilio.com)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+91xxxxxxxxxx
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/twilio

# ElevenLabs (https://elevenlabs.io)
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID=your_agent_id

# Website to crawl
TARGET_WEBSITE=https://www.tamilpreneur.in/grand-sangamam

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Session prefix
SESSION_PREFIX=GS-2026
```

### Frontend / Admin `.env`
```env
VITE_API_URL=https://yourdomain.com
```

---

## 5. Database Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| `admin_users` | Admin dashboard accounts |
| `chat_sessions` | Each visitor session (GS-2026-XXXXXX) |
| `chat_messages` | All messages (user + bot) |
| `leads` | Captured phone numbers + status |
| `call_logs` | Twilio call records |
| `call_recordings` | Recording URLs + transcripts |
| `knowledge_base` | Crawled website content |
| `faqs` | Manual FAQ entries |
| `analytics` | Daily rollup stats |
| `app_settings` | Key-value config storage |
| `audit_logs` | Admin action history |

### Key Relationships
```
chat_sessions ──1:many──► chat_messages
chat_sessions ──1:1─────► leads
chat_sessions ──1:1─────► call_logs
call_logs ─────1:1─────► call_recordings
admin_users ───1:many──► audit_logs
```

---

## 6. API Documentation

### Public Endpoints (No Auth)

#### Create Chat Session
```
POST /api/chat/session
Body: { "browserId": "uuid" }
Response: { "sessionId": "GS-2026-000001", "browserId": "uuid" }
```

#### Stream Chat Message (SSE)
```
POST /api/chat/message
Body: { "sessionId": "GS-2026-000001", "message": "What is Grand Sangamam?" }
Response: text/event-stream
  data: {"text": "Grand Sangamam is...", "done": false}
  data: {"done": true, "fullResponse": "...", "shouldCollectLead": false}
```

#### Submit Lead (Phone Number)
```
POST /api/leads
Body: { "sessionId": "GS-2026-000001", "phone": "9876543210", "name": "Ravi" }
Response: { "success": true, "message": "Our team will call you..." }
```

#### Get Suggested Questions
```
GET /api/chat/suggestions
Response: { "suggestions": [{"id": 1, "text": "What is Grand Sangamam?"}] }
```

### Twilio Webhooks (No Auth — Twilio calls these)
```
GET/POST /api/twilio/voice          → Returns TwiML for call
POST     /api/twilio/status         → Call status updates
POST     /api/twilio/recording      → Recording URL callback
```

### Admin Endpoints (JWT Required)
All require: `Authorization: Bearer <token>`

```
POST   /api/auth/login              → Login
GET    /api/auth/profile            → Get current admin
PUT    /api/auth/change-password    → Change password

GET    /api/analytics/stats         → Dashboard stats
GET    /api/analytics/trend         → Visitor trend (daily/weekly/monthly)
GET    /api/analytics/questions     → Popular question keywords

GET    /api/leads                   → List leads (paginated)
PUT    /api/leads/:id               → Update lead status/notes
POST   /api/leads/:id/retry-call    → Retry failed call

GET    /api/calls                   → List calls (paginated)
GET    /api/calls/recordings        → List recordings

GET    /api/knowledge               → List knowledge entries
POST   /api/knowledge               → Add manual entry
PUT    /api/knowledge/:id           → Update entry
DELETE /api/knowledge/:id           → Soft delete entry
POST   /api/knowledge/reindex       → Trigger website crawl
GET    /api/knowledge/elevenlabs-prompt → Get AI agent prompt

GET    /api/admin/sessions          → All chat sessions
GET    /api/admin/sessions/:id      → Session detail + conversation
GET    /api/admin/users             → List admins
POST   /api/admin/users             → Create admin

GET    /api/settings                → Get app settings
PUT    /api/settings                → Save app settings
```

---

## 7. Deployment Guide

### Option A: Docker (Recommended)

```bash
# 1. Clone project to server
git clone <repo> /opt/grand-sangamam
cd /opt/grand-sangamam

# 2. Configure environment
cp backend/.env.example backend/.env
nano backend/.env    # Fill in all API keys

# 3. Update docker-compose.yml
# Set POSTGRES_PASSWORD to something strong
# Set VITE_API_URL to your domain

# 4. Build and start
docker compose up -d --build

# 5. Check logs
docker compose logs -f backend

# 6. SSL setup (after DNS propagates)
docker compose --profile ssl up certbot
docker compose restart nginx
```

### Option B: PM2 (Without Docker)

```bash
# 1. Install dependencies
cd /opt/grand-sangamam/backend && npm ci
cd /opt/grand-sangamam/frontend && npm ci && npm run build
cd /opt/grand-sangamam/admin && npm ci && npm run build

# 2. Setup database
cd backend
npx prisma migrate deploy
npm run seed

# 3. Start with PM2
cd /opt/grand-sangamam
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 4. Serve static files
# Copy frontend/dist → /var/www/gs-chatbot
# Copy admin/dist → /var/www/gs-admin
# Configure Nginx to serve these directories
```

### Nginx Configuration
Edit `/home/claude/grand-sangamam/nginx/nginx.conf`:
- Replace `yourdomain.com` with your actual domain
- Replace `admin.yourdomain.com` with your admin subdomain
- Update SSL certificate paths if not using Let's Encrypt

### SSL with Let's Encrypt
```bash
# Get certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com -d admin.yourdomain.com

# Auto-renewal (already set up by certbot)
# Verify: certbot renew --dry-run
```

### Twilio Webhook Setup
In Twilio Console:
1. Go to Phone Numbers → Your Number → Voice
2. Set "A call comes in" webhook: `https://yourdomain.com/api/twilio/voice`
3. The outbound call webhook URL is set via `TWILIO_WEBHOOK_URL` in `.env`

### ElevenLabs Agent Setup
1. Go to [elevenlabs.io](https://elevenlabs.io) → Conversational AI
2. Create new Agent
3. Set the system prompt from Admin Dashboard → Knowledge Base → "Get ElevenLabs Prompt"
4. Set voice: "Rachel" or any Indian English voice
5. Copy Agent ID → paste in `.env` as `ELEVENLABS_AGENT_ID`

---

## 8. Admin Dashboard Guide

### Login
- URL: `https://admin.yourdomain.com/admin/login`
- Default: `admin` / `Admin@2026` → **Change immediately!**

### Dashboard
- Real-time metrics refreshed every 30 seconds
- 12 stat cards: visitors, leads, calls, averages
- 7-day performance chart (visitors, leads, calls)
- Quick action buttons

### Conversations
- Full list of all chat sessions with search/filter
- Click any session to see complete conversation timeline
- Includes AI responses, user messages, lead info, call details

### Leads
- All captured phone numbers
- Status workflow: `new → called → callback → converted / lost`
- Assign team members, set follow-up dates, add notes
- Retry failed calls with 📞 button
- Export to CSV

### Calls
- All Twilio call records with status
- Call recordings with audio player
- Transcripts and AI summaries
- Download recordings

### Knowledge Base
- View all indexed website content
- **Re-index Website** button re-crawls tamilpreneur.in/grand-sangamam
- Add manual entries for info not on the website
- Filter by category (registration, speakers, venue, etc.) or source

### Settings
- Securely update API keys without redeployment
- Configure Twilio webhook URL, ElevenLabs agent ID
- Set website URL to crawl

---

## 9. Troubleshooting

### Chat not responding
```bash
# Check backend is running
curl http://localhost:5000/health

# Check Gemini API key
# Logs:
docker compose logs backend | grep -i gemini
```

### Calls not triggering
```bash
# 1. Verify Twilio credentials in .env
# 2. Ensure TWILIO_WEBHOOK_URL is publicly accessible
# 3. Test webhook manually:
curl -X POST https://yourdomain.com/api/twilio/voice?sessionId=test

# 4. Check Twilio dashboard for errors:
# https://console.twilio.com/us1/monitor/logs/calls
```

### Website crawl returns no content
```bash
# Test manually:
curl https://www.tamilpreneur.in/grand-sangamam

# If blocked, check:
# - User-Agent in crawler.js
# - Add delays between requests (already 1s)
# - Try crawling individual pages from admin
```

### Database connection failed
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check DATABASE_URL format:
# postgresql://user:password@host:5432/dbname

# Run migrations manually:
cd backend && npx prisma migrate deploy
```

### Socket.IO not connecting
```bash
# Check CORS settings in backend/src/index.js
# Ensure FRONTEND_URL and ADMIN_URL are correct

# Check Nginx WebSocket config:
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";
```

### Admin login fails
```bash
# Reset admin password:
cd backend
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
bcrypt.hash('NewPassword@2026', 12).then(h => 
  p.adminUser.update({ where: { username: 'admin' }, data: { passwordHash: h } })
  .then(() => { console.log('Done'); p.\$disconnect(); })
);
"
```

---

## 10. Backup & Restore

### Database Backup
```bash
# Automated daily backup (add to crontab)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/backups/grand-sangamam
mkdir -p $BACKUP_DIR

# Docker
docker exec gs_postgres pg_dump -U gsadmin grand_sangamam | \
  gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Bare metal
pg_dump -U gsadmin grand_sangamam | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_$DATE.sql.gz"
```

Add to crontab: `0 2 * * * /opt/backups/backup.sh >> /var/log/gs-backup.log 2>&1`

### Database Restore
```bash
# Stop backend first
docker compose stop backend

# Restore
gunzip -c /opt/backups/grand-sangamam/db_20260101_020000.sql.gz | \
  docker exec -i gs_postgres psql -U gsadmin grand_sangamam

# Restart
docker compose start backend
```

### Recording Backup
```bash
# Recordings are stored as URLs in DB (Twilio hosts them)
# Download locally:
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const https = require('https');
const fs = require('fs');
p.callRecording.findMany({ select: { recordingUrl: true, id: true } }).then(recs => {
  recs.forEach(r => {
    if (r.recordingUrl) {
      const file = fs.createWriteStream(\`/opt/backups/recordings/\${r.id}.mp3\`);
      https.get(r.recordingUrl, res => res.pipe(file));
    }
  });
  p.\$disconnect();
});
"
```

---

## 11. Maintenance

### Update Dependencies
```bash
cd backend && npm update
cd frontend && npm update
cd admin && npm update

# Rebuild Docker images
docker compose up -d --build
```

### Re-crawl Website (after event updates)
- Admin Dashboard → Knowledge Base → Re-index Website
- Or via API: `POST /api/knowledge/reindex` (with JWT)

### Clear Old Chat Sessions
```bash
# Delete sessions older than 90 days (run monthly)
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
p.chatSession.deleteMany({ where: { createdAt: { lt: cutoff }, status: 'abandoned' } })
  .then(r => { console.log('Deleted:', r.count); p.\$disconnect(); });
"
```

### Monitor Logs
```bash
# Docker
docker compose logs -f --tail=100 backend

# PM2
pm2 logs gs-backend --lines 100

# Error logs
tail -f backend/logs/error.log
```

### Scale for High Traffic
```bash
# Increase PM2 instances (ecosystem.config.cjs)
instances: 'max'   # Uses all CPU cores

# Or with Docker
docker compose up -d --scale backend=3
# (Ensure Nginx is load balancing across backends)
```

---

## Folder Structure

```
grand-sangamam/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry point
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── chatController.js  # SSE streaming
│   │   │   ├── leadController.js  # Lead capture + auto-call
│   │   │   ├── analyticsController.js
│   │   │   ├── knowledgeController.js
│   │   │   └── twilioController.js
│   │   ├── routes/               # Express routers
│   │   ├── services/
│   │   │   ├── gemini.js         # AI + RAG search
│   │   │   ├── crawler.js        # Website crawling
│   │   │   └── twilio.js         # Outbound calling
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT middleware
│   │   ├── websocket/
│   │   │   └── socket.js         # Socket.IO setup
│   │   └── utils/
│   │       ├── logger.js         # Winston logger
│   │       ├── sessionId.js      # GS-2026-XXXXXX generator
│   │       └── seed.js           # DB seeder
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (11 tables)
│   ├── logs/                     # Runtime logs
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── frontend/                     # Chatbot widget
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWidget.jsx    # Main floating chatbot
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   ├── SuggestedQuestions.jsx
│   │   │   └── LeadForm.jsx      # Phone number form
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile
│   └── package.json
│
├── admin/                        # Admin dashboard
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ConversationsPage.jsx
│   │   │   ├── ConversationDetailPage.jsx
│   │   │   ├── LeadsPage.jsx
│   │   │   ├── CallsPage.jsx
│   │   │   ├── RecordingsPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── KnowledgeBasePage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── AdminUsersPage.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx        # Sidebar + navigation
│   │   │   └── StatCard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useApi.js
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
│
├── nginx/
│   └── nginx.conf                # Reverse proxy + SSL config
│
├── docs/
│   └── README.md                 # This file
│
├── docker-compose.yml
├── ecosystem.config.cjs          # PM2 config
└── .gitignore
```

---

## Security Checklist

- [ ] Change default admin password immediately after first login
- [ ] Use strong `JWT_SECRET` (64+ random characters)
- [ ] Set strong `POSTGRES_PASSWORD` 
- [ ] Configure CORS with exact production URLs
- [ ] Restrict admin subdomain to specific IPs (Nginx `allow/deny`)
- [ ] Enable HTTPS / SSL certificates before going live
- [ ] Rotate API keys periodically
- [ ] Review Twilio webhook signature validation
- [ ] Set up automated database backups
- [ ] Enable server firewall (allow only 80, 443, 22)
- [ ] Use environment variables (not DB) for API keys in production

---

*Grand Sangamam AI Chatbot — Built for Tamilpreneur*
*Version 1.0.0 — 2026*
