import Database from 'better-sqlite3';

const db = new Database('support.db');

db.pragma('journal_mode = WAL');

// Initialize schema
// conversations: a client session for triage Q&A
// messages: chat-style Q&A between client and AI
// tickets: finalized tickets routed to staff

db.exec(`
CREATE TABLE IF NOT EXISTS conversations (
	id TEXT PRIMARY KEY,
	created_at INTEGER NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('active','completed','abandoned')),
	category TEXT,
	client_email TEXT
);

CREATE TABLE IF NOT EXISTS messages (
	id TEXT PRIMARY KEY,
	conversation_id TEXT NOT NULL,
	role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
	content TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tickets (
	id TEXT PRIMARY KEY,
	conversation_id TEXT NOT NULL,
	category TEXT NOT NULL,
	assigned_to TEXT NOT NULL,
	client_email TEXT,
	summary TEXT NOT NULL,
	details TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);
`);

export default db;
