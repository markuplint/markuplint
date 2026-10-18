import type { PageResult } from './types.ts';

export type FetchLike = (
	url: string,
	init: { headers: Record<string, string>; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

export type FetchOptions = {
	readonly fetchImpl?: FetchLike;
	readonly sleep?: (ms: number) => Promise<void>;
	/** Attempts, the first included. */
	readonly retries?: number;
	/** Delay before the second attempt; it doubles for each one after. */
	readonly delayMs?: number;
	readonly timeoutMs?: number;
	readonly concurrency?: number;
};

const USER_AGENT = 'markuplint-spec-citations (https://github.com/markuplint/markuplint)';

const defaultFetch: FetchLike = (url, init) => globalThis.fetch(url, init);
const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function describe(error: unknown): string {
	if (!(error instanceof Error)) {
		return String(error);
	}
	return error.cause instanceof Error ? `${error.message} (${error.cause.message})` : error.message;
}

/**
 * Fetches one page, retrying a failure that may pass (a 5xx, a throttled
 * request, a dropped connection) and giving up at once on a 404. A body that is cut off
 * part-way is a dropped connection too, and is retried.
 *
 * The `catch` below does not guard with `isFatalError()`, deliberately: Node's
 * `fetch` reports a network failure as a `TypeError` ("fetch failed"), which
 * that guard classifies as an invariant of our own code being broken. The `try`
 * holds the network call and nothing else, so a bug of ours cannot be taken
 * for a network failure.
 */
export async function fetchPage(url: string, options: FetchOptions = {}): Promise<PageResult> {
	const { fetchImpl = defaultFetch, sleep = defaultSleep, retries = 3, delayMs = 1000, timeoutMs = 60_000 } = options;
	let message = 'no attempt was made';
	for (let attempt = 1; attempt <= retries; attempt++) {
		if (attempt > 1) {
			await sleep(delayMs * 2 ** (attempt - 2));
		}
		try {
			const response = await fetchImpl(url, {
				headers: { 'User-Agent': USER_AGENT },
				signal: AbortSignal.timeout(timeoutMs),
			});
			if (response.ok) {
				return { status: 'ok', html: await response.text() };
			}
			message = `HTTP ${response.status}`;
			if (response.status === 404) {
				break;
			}
		} catch (error) {
			message = describe(error);
		}
	}
	return { status: 'failed', message };
}

/** Fetches every distinct URL once, a few at a time. */
export async function fetchPages(urls: Iterable<string>, options: FetchOptions = {}): Promise<Map<string, PageResult>> {
	const queue = [...new Set(urls)];
	const results = new Map<string, PageResult>();
	const worker = async () => {
		for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
			results.set(url, await fetchPage(url, options));
		}
	};
	await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 4, queue.length) }, worker));
	return results;
}
