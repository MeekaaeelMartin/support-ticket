import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
	secure: false,
	auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	} : undefined,
});

export async function sendTicketEmail(opts: { to: string; subject: string; html: string; text?: string; }): Promise<void> {
	await transporter.sendMail({
		from: process.env.FROM_EMAIL || 'support@example.com',
		to: opts.to,
		subject: opts.subject,
		html: opts.html,
		text: opts.text,
	});
}

export function getAssigneeForCategory(category: 'website' | 'email' | 'social' | 'admin'): string {
	switch (category) {
		case 'website': return process.env.ASSIGN_WEBSITE || 'webteam@example.com';
		case 'email': return process.env.ASSIGN_EMAIL || 'emailteam@example.com';
		case 'social': return process.env.ASSIGN_SOCIAL || 'socialteam@example.com';
		default: return process.env.ASSIGN_ADMIN || 'adminteam@example.com';
	}
}
