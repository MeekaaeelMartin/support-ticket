import React, { useMemo, useRef, useState } from 'react';
import { postJSON } from '../lib/api';

type Message = { role: 'user' | 'assistant'; content: string };

type StartResponse = {
	conversationId: string;
	category: 'website'|'email'|'social'|'admin';
	followUps: string[];
	stop: boolean;
	summary: string | null;
	messages: { role: 'user'|'assistant'|'system'; content: string }[];
};

type ContinueResponse = Omit<StartResponse, 'conversationId'>;

const categoryLabel: Record<StartResponse['category'], string> = {
	website: 'Website Support',
	email: 'Email & Mailboxes',
	social: 'Social Media',
	admin: 'Administrative',
};

export function SupportApp() {
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [category, setCategory] = useState<StartResponse['category'] | null>(null);
	const [input, setInput] = useState('');
	const [email, setEmail] = useState('');
	const [messages, setMessages] = useState<Message[]>([]);
	const [stop, setStop] = useState(false);
	const [summary, setSummary] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const title = useMemo(() => 'Support Portal', []);

	async function start() {
		if (!input.trim()) return;
		setBusy(true);
		try {
			const data = await postJSON<StartResponse>('/api/triage/start', { query: input.trim(), clientEmail: email || undefined });
			setConversationId(data.conversationId);
			setCategory(data.category);
			setSummary(data.summary ?? null);
			setStop(data.stop);
			const msgs: Message[] = [];
			for (const m of data.messages) if (m.role !== 'system') msgs.push({ role: m.role, content: m.content });
			setMessages(msgs);
			setInput('');
		} finally { setBusy(false); }
	}

	async function answer() {
		if (!conversationId || !input.trim()) return;
		setBusy(true);
		try {
			const data = await postJSON<ContinueResponse>('/api/triage/continue', { conversationId, answer: input.trim() });
			setCategory(data.category);
			setSummary(data.summary ?? null);
			setStop(data.stop);
			const msgs: Message[] = [];
			for (const m of data.messages) if (m.role !== 'system') msgs.push({ role: m.role, content: m.content });
			setMessages(msgs);
			setInput('');
			if (inputRef.current) inputRef.current.focus();
		} finally { setBusy(false); }
	}

	async function submitTicket() {
		if (!conversationId || !category) return;
		setBusy(true);
		try {
			await postJSON('/api/tickets/submit', { conversationId, category, clientEmail: email || undefined, summary: summary || 'Support request' });
			setSubmitted(true);
		} finally { setBusy(false); }
	}

	return (
		<div>
			<div className="header"><div className="nav"><div className="brand">Tecbot Support</div><div className="badge">24/7 AI Triage</div></div></div>
			<div className="container">
				<div className="hero">
					<div className="card">
						<h1 className="h1">{title}</h1>
						<p className="sub">Tell us what you need. Our AI will clarify details, then we route your ticket to the right team.</p>
						<div className="row" style={{ alignItems: 'flex-start' }}>
							<div style={{ flex: 2 }}>
								<label>Your request</label>
								<textarea ref={inputRef} rows={5} value={input} onChange={e => setInput(e.target.value)} placeholder="e.g., Please add a banner to the homepage and fix the contact form..." />
							</div>
							<div style={{ flex: 1 }}>
								<label>Your email (optional)</label>
								<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
								<div style={{ marginTop: 8 }} className="small">We use this to send ticket updates.</div>
							</div>
						</div>
						<div className="row">
							{!conversationId ? (
								<button className="btn" onClick={start} disabled={busy || !input.trim()}>Start triage</button>
							) : !stop ? (
								<button className="btn" onClick={answer} disabled={busy || !input.trim()}>Send answer</button>
							) : (
								<button className="btn" onClick={submitTicket} disabled={busy || submitted}>Create ticket</button>
							)}
							{category && <span className="badge">Category: {categoryLabel[category]}</span>}
						</div>
					</div>

					<div className="card">
						<h2 style={{ marginTop: 0 }}>Conversation</h2>
						<div className="chat">
							{messages.length === 0 && <div className="small">No messages yet. Submit your request to begin.</div>}
							{messages.map((m, i) => (
								<div key={i} className={`msg ${m.role}`}>{m.content}</div>
							))}
						</div>
						{submitted && <p className="small">Ticket submitted. We'll be in touch shortly.</p>}
					</div>
				</div>

				<div className="footer">© {new Date().getFullYear()} Tecbot</div>
			</div>
		</div>
	);
}
