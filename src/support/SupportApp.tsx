import React, { useMemo, useRef, useState } from 'react';

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

	const title = useMemo(() => 'Support Request', []);

	async function start() {
		if (!input.trim()) return;
		setBusy(true);
		try {
			const res = await fetch('/api/triage/start', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: input.trim(), clientEmail: email || undefined }),
			});
			const data: StartResponse = await res.json();
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
			const res = await fetch('/api/triage/continue', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ conversationId, answer: input.trim() }),
			});
			const data: ContinueResponse = await res.json();
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
			const res = await fetch('/api/tickets/submit', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ conversationId, category, clientEmail: email || undefined, summary: summary || 'Support request' }),
			});
			if (res.ok) setSubmitted(true);
		} finally { setBusy(false); }
	}

	return (
		<div className="container">
			<h2>{title}</h2>
			<div className="card">
				<div className="row">
					<div style={{ flex: 2 }}>
						<label>Your request</label>
						<textarea ref={inputRef} rows={4} value={input} onChange={e => setInput(e.target.value)} placeholder="Describe what you need help with..." />
					</div>
					<div style={{ flex: 1 }}>
						<label>Your email (optional)</label>
						<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
					</div>
				</div>
				<div className="row">
					{!conversationId ? (
						<button onClick={start} disabled={busy || !input.trim()}>Submit</button>
					) : !stop ? (
						<button onClick={answer} disabled={busy || !input.trim()}>Send answer</button>
					) : (
						<button onClick={submitTicket} disabled={busy || submitted}>Create ticket</button>
					)}
					{category && <span className="small">Category: {category}</span>}
				</div>

				<div className="chat">
					{messages.map((m, i) => (
						<div key={i} className={`msg ${m.role}`}>{m.content}</div>
					))}
				</div>

				{submitted && <p className="small">Ticket submitted. We'll be in touch shortly.</p>}
			</div>
		</div>
	);
}
