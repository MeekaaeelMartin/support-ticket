import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router as triageRouter } from './routes/triage';
import { router as ticketsRouter } from './routes/tickets';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

app.use('/api/triage', triageRouter);
app.use('/api/tickets', ticketsRouter);

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
