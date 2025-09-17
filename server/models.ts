import db from './db';
import { randomUUID } from 'crypto';

export type Category = 'website' | 'email' | 'social' | 'admin';

export interface Conversation {
	id: string;
	created_at: number;
	status: 'active' | 'completed' | 'abandoned';
	category?: Category;
	client_email?: string;
}

export interface Message {
	id: string;
	conversation_id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	created_at: number;
}

export interface Ticket {
	id: string;
	conversation_id: string;
	category: Category;
	assigned_to: string;
	client_email?: string;
	summary: string;
	details: string;
	created_at: number;
}

export function createConversation(params: { category?: Category; client_email?: string }): Conversation {
	const id = randomUUID();
	const created_at = Date.now();
	db.prepare(
		`INSERT INTO conversations (id, created_at, status, category, client_email) VALUES (?, ?, 'active', ?, ?)`
	).run(id, created_at, params.category ?? null, params.client_email ?? null);
	return { id, created_at, status: 'active', category: params.category, client_email: params.client_email };
}

export function getConversation(id: string): Conversation | undefined {
	const row = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id);
	return row as Conversation | undefined;
}

export function updateConversation(id: string, updates: Partial<Pick<Conversation, 'status' | 'category' | 'client_email'>>): void {
	const conv = getConversation(id);
	if (!conv) throw new Error('Conversation not found');
	const status = updates.status ?? conv.status;
	const category = updates.category ?? conv.category ?? null;
	const client_email = updates.client_email ?? conv.client_email ?? null;
	db.prepare(`UPDATE conversations SET status = ?, category = ?, client_email = ? WHERE id = ?`).run(status, category, client_email, id);
}

export function addMessage(conversation_id: string, role: Message['role'], content: string): Message {
	const id = randomUUID();
	const created_at = Date.now();
	db.prepare(
		`INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`
	).run(id, conversation_id, role, content, created_at);
	return { id, conversation_id, role, content, created_at };
}

export function listMessages(conversation_id: string): Message[] {
	return db.prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`).all(conversation_id) as Message[];
}

export function createTicket(params: Omit<Ticket, 'id' | 'created_at'>): Ticket {
	const id = randomUUID();
	const created_at = Date.now();
	db.prepare(
		`INSERT INTO tickets (id, conversation_id, category, assigned_to, client_email, summary, details, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	).run(id, params.conversation_id, params.category, params.assigned_to, params.client_email ?? null, params.summary, params.details, created_at);
	return { id, created_at, ...params };
}

export function getTicket(id: string): Ticket | undefined {
	return db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(id) as Ticket | undefined;
}
