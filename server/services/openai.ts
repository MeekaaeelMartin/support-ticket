import OpenAI from 'openai';
import { z } from 'zod';
import { Category } from '../models';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

export async function classifyAndAsk(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<TriageResponse> {
	const response = await client.chat.completions.create({
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
	try {
		parsed = JSON.parse(raw as string);
	} catch {
		parsed = {};
	}
	const result = TriageResponseSchema.safeParse(parsed);
	if (!result.success) {
		return { category: 'admin', followUps: [], stop: true };
	}
	return result.data;
}

export function mapCategoryFromText(text: string): Category {
	const t = text.toLowerCase();
	if (t.includes('website')) return 'website';
	if (t.includes('mail') || t.includes('email')) return 'email';
	if (t.includes('social')) return 'social';
	return 'admin';
}
