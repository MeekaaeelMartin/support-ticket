import React, { useEffect, useMemo, useRef, useState } from 'react';
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
	const scrollRef = useRef<HTMLDivElement>(null);

	const title = useMemo(() => 'Support Portal', []);

	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages]);

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

	const canSend = input.trim().length > 0 && !busy;
	const primaryAction = !conversationId ? start : (!stop ? answer : submitTicket);
	const primaryLabel = !conversationId ? 'Start triage' : (!stop ? 'Send' : 'Create ticket');

	return (
		<div>
			<div className="header"><div className="nav"><div className="brand">Tecbot Support</div><div className="badge">24/7 AI Triage</div></div></div>
			<div className="container">
				<div className="hero">
					<div className="card">
						<h1 className="h1">{title}</h1>
						<p className="sub">Tell us what you need. Our AI will clarify details, then we route your ticket to the right team.</p>

						<label>Your email (for updates)</label>
						<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
						<div className="small" style={{ marginTop: 6 }}>We use this to send ticket updates.</div>

						<div style={{ height: 16 }} />

						<div className="chat-shell">
							<div className="chat-header">
								<div className="small">Chat</div>
								{category && <span className="badge">{categoryLabel[category]}</span>}
							</div>
							<div ref={scrollRef} className="chat-scroll">
								{messages.length === 0 && <div className="small">Start by describing your request below.</div>}
								{messages.map((m, i) => (
									<div key={i} className="msg">
										<div className={`avatar ${m.role}`}>{m.role === 'assistant' ? 'AI' : 'U'}</div>
										<div className={`bubble ${m.role}`}>{m.content}</div>
									</div>
								))}
							</div>
							<div className="chat-input">
								<div className="input-row">
									<textarea ref={inputRef} placeholder={!conversationId ? 'Describe your issue...' : (!stop ? 'Type your answer...' : 'Ready to create your ticket')} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) primaryAction(); } }} />
									<button className="btn send-btn" onClick={primaryAction} disabled={!canSend}>{primaryLabel}</button>
								</div>
								{submitted && <div className="small" style={{ marginTop: 8 }}>Ticket submitted. We'll be in touch shortly.</div>}
							</div>
						</div>
					</div>

					<div className="card">
						<h2 style={{ marginTop: 0 }}>Tips for faster resolution</h2>
						<ul>
							<li>Include URLs and screenshots (paste links).</li>
							<li>Mention urgency or deadlines.</li>
							<li>Share account names (no passwords).</li>
						</ul>
					</div>
				</div>

				<div className="footer">© {new Date().getFullYear()} Tecbot</div>
			</div>
		</div>
	);
}
