export const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function postJSON<T>(path: string, body: any): Promise<T> {
	const url = `${API_BASE}${path}`;
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
