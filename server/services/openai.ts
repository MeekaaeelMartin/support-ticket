import OpenAI from 'openai';
import { z } from 'zod';
import { Category } from '../models';

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
	if (client) return client;
	if (!process.env.OPENAI_API_KEY) return null;
	client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	return client;
}

const CategorySchema = z.enum(['website', 'email', 'social', 'admin']);

const TriageResponseSchema = z.object({
	category: CategorySchema,
	followUps: z.array(z.string()).default([]),
	stop: z.boolean().default(false),
	summary: z.string().optional(),
});

export type TriageResponse = z.infer<typeof TriageResponseSchema>;

const systemPrompt = `You are a support intake triage assistant for an MSP.
Classify each client request into exactly one category:
- website: Website changes & support
- email: Email issues & mailbox setup
- social: Social media requests
- admin: Administrative requests (invoicing, accounts, etc.)

When you need clarification, propose up to 3 concise follow-up questions. Stop asking follow ups when you are confident you can create a useful internal ticket.
`;

function textCategory(text: string): Category {
	const t = text.toLowerCase();
	if (/(website|wordpress|page|landing|form|banner|homepage|cms|web)/.test(t)) return 'website';
	if (/(email|mailbox|outlook|mx\b|spf\b|dkim\b|imap|smtp)/.test(t)) return 'email';
	if (/(social|instagram|facebook|tiktok|\bx\b|twitter|linkedin)/.test(t)) return 'social';
	return 'admin';
}

function hasSufficientInfo(text: string): boolean {
	const hasUrl = /https?:\/\//i.test(text);
	const mentionsUrgency = /(urgent|asap|priority|immediately|deadline|today|tomorrow)/i.test(text);
	const hasAccount = /(username|account|mailbox|domain)/i.test(text);
	const hasConcreteTask = /(fix|add|remove|setup|configure|update|install)/i.test(text);
	const signals = [hasUrl, mentionsUrgency, hasAccount, hasConcreteTask].filter(Boolean).length;
	return signals >= 2;
}

function heuristicTriage(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): TriageResponse {
	const convoText = messages.map(m => m.content).join(' \n ');
	const category = textCategory(convoText);
	const stop = hasSufficientInfo(convoText) || messages.filter(m => m.role === 'user').length >= 2;
	const followUps: string[] = stop ? [] : [
		'What is the impact or urgency of this request?',
		'Please share any relevant URLs, usernames, or account names (no passwords).',
		'Is there a deadline or target date for completion?'
	];
	const summary = stop ? 'I have enough details to create your ticket. I will summarize and proceed.' : undefined;
	return { category, followUps, stop, summary };
}

export async function classifyAndAsk(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<TriageResponse> {
	const c = getClient();
	if (!c) return heuristicTriage(messages);
	const response = await c.chat.completions.create({
		model: 'gpt-4o-mini',
		messages: [
			{ role: 'system', content: systemPrompt },
			...messages,
		],
		response_format: { type: 'json_schema', json_schema: {
			name: 'triage_schema',
			schema: {
				type: 'object',
				additionalProperties: false,
				required: ['category','followUps','stop'],
				properties: {
					category: { type: 'string', enum: ['website','email','social','admin'] },
					followUps: { type: 'array', items: { type: 'string' } },
					stop: { type: 'boolean' },
					summary: { type: 'string' }
				}
			}
		}},
		temperature: 0.2
	});
	const raw = response.choices[0]?.message?.content ?? '{}';
	let parsed: unknown;
	try { parsed = JSON.parse(raw as string); } catch { parsed = {}; }
	const result = TriageResponseSchema.safeParse(parsed);
	if (!result.success) return heuristicTriage(messages);
	return result.data;
}

export function mapCategoryFromText(text: string): Category {
	return textCategory(text);
}
