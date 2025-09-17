export const API_BASE_RAW = import.meta.env.VITE_API_BASE || '';
const BASE = API_BASE_RAW.replace(/\/+$/, '');

function buildUrl(path: string): string {
	const p = path.startsWith('/') ? path : `/${path}`;
	if (!BASE && !import.meta.env.DEV) {
		throw new Error('Missing VITE_API_BASE in production. Set it to your backend URL.');
	}
	return `${BASE}${p}`;
}

export const API_BASE = BASE;

export async function postJSON<T>(path: string, body: any): Promise<T> {
	const url = buildUrl(path);
	let res: Response;
	try {
		res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
	} catch (e) {
		throw new Error(`Network error calling ${url}: ${(e as Error).message}`);
	}
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Request failed ${res.status} on ${url}: ${text}`);
	}
	return res.json();
}
