import { createHash } from 'node:crypto';

export type MessageIdInput = {
	readonly path: string;
	readonly type: string;
	readonly message: string;
	readonly firstLine: number | null;
	readonly firstColumn: number | null;
};

export function buildMessageId(input: MessageIdInput): string {
	const hash = createHash('sha256');
	hash.update(input.path);
	hash.update('\0');
	hash.update(input.type);
	hash.update('\0');
	hash.update(input.message);
	hash.update('\0');
	hash.update(String(input.firstLine ?? ''));
	hash.update('\0');
	hash.update(String(input.firstColumn ?? ''));
	return `nv-${hash.digest('hex').slice(0, 12)}`;
}

export function disambiguateIds(ids: readonly string[]): string[] {
	const counts = new Map<string, number>();
	return ids.map(id => {
		const n = counts.get(id) ?? 0;
		counts.set(id, n + 1);
		return n === 0 ? id : `${id}-${n}`;
	});
}

export function buildMessageIds(inputs: readonly MessageIdInput[]): string[] {
	return disambiguateIds(inputs.map(input => buildMessageId(input)));
}
