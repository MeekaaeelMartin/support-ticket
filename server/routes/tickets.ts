import { Router } from 'express';
import { z } from 'zod';
import { createTicket, getConversation, listMessages } from '../models';
import { getAssigneeForCategory, sendTicketEmail } from '../services/mailer';

export const router = Router();

const SubmitSchema = z.object({
	conversationId: z.string().uuid(),
	category: z.enum(['website','email','social','admin']),
	clientEmail: z.string().email().optional(),
	summary: z.string().min(3),
});

router.post('/submit', async (req, res) => {
	const parsed = SubmitSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
	const { conversationId, category, clientEmail, summary } = parsed.data;
	const conv = getConversation(conversationId);
	if (!conv) return res.status(404).json({ error: 'Conversation not found' });
	const assigned_to = getAssigneeForCategory(category);
	const messages = listMessages(conversationId);
	const details = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
	const ticket = createTicket({ conversation_id: conversationId, category, assigned_to, client_email: clientEmail ?? conv.client_email, summary, details });
	try {
		await sendTicketEmail({
			to: assigned_to,
			subject: `[Support Ticket] ${category.toUpperCase()} - ${summary}`,
			html: `<p>New ticket assigned to you.</p><p><strong>Category:</strong> ${category}</p><p><strong>Client:</strong> ${clientEmail ?? conv.client_email ?? 'Unknown'}</p><pre>${details.replace(/</g,'&lt;')}</pre>`,
			text: `New ticket assigned to you.\nCategory: ${category}\nClient: ${clientEmail ?? conv.client_email ?? 'Unknown'}\n\n${details}`,
		});
	} catch (e) {
		console.error('Failed to send email', e);
	}
	res.json({ ticket });
});
