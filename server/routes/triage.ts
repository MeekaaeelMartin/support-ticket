import { Router } from 'express';
import { z } from 'zod';
import { addMessage, createConversation, getConversation, listMessages, updateConversation } from '../models';
import { classifyAndAsk } from '../services/openai';

export const router = Router();

const StartSchema = z.object({
	query: z.string().min(1),
	clientEmail: z.string().email().optional(),
});

router.post('/start', async (req, res) => {
	const parsed = StartSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
	const { query, clientEmail } = parsed.data;
	const conversation = createConversation({ client_email: clientEmail });
	addMessage(conversation.id, 'user', query);
	const triage = await classifyAndAsk([{ role: 'user', content: query }]);
	if (triage.category) updateConversation(conversation.id, { category: triage.category });
	if (triage.followUps.length > 0) {
		addMessage(conversation.id, 'assistant', triage.followUps.join('\n'));
	}
	res.json({
		conversationId: conversation.id,
		category: triage.category,
		followUps: triage.followUps,
		stop: triage.stop,
		summary: triage.summary ?? null,
		messages: listMessages(conversation.id),
	});
});

const ContinueSchema = z.object({
	conversationId: z.string().uuid(),
	answer: z.string().min(1),
});

router.post('/continue', async (req, res) => {
	const parsed = ContinueSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
	const { conversationId, answer } = parsed.data;
	const conv = getConversation(conversationId);
	if (!conv) return res.status(404).json({ error: 'Conversation not found' });
	addMessage(conversationId, 'user', answer);
	const prior = listMessages(conversationId).map(m => ({ role: m.role, content: m.content }));
	const triage = await classifyAndAsk(prior as any);
	if (triage.category) updateConversation(conversationId, { category: triage.category });
	if (triage.followUps.length > 0) {
		addMessage(conversationId, 'assistant', triage.followUps.join('\n'));
	}
	if (triage.stop) updateConversation(conversationId, { status: 'completed' });
	res.json({
		category: triage.category,
		followUps: triage.followUps,
		stop: triage.stop,
		summary: triage.summary ?? null,
		messages: listMessages(conversationId),
	});
});
