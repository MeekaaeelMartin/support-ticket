# Support Ticket Portal

## Setup
1. Copy .env.example to .env and fill values.
2. In one terminal: npm run dev (backend on 3001).
3. In another: npm run client (frontend on 5173).

## API
- POST /api/triage/start { query, clientEmail? }
- POST /api/triage/continue { conversationId, answer }
- POST /api/tickets/submit { conversationId, category, clientEmail?, summary }

