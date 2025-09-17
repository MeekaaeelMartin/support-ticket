export const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function postJSON<T>(path: string, body: any): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`Request failed: ${res.status}`);
	return res.json();
}
