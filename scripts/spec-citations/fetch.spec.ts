import { describe, expect, test } from 'vitest';

import type { FetchLike } from './fetch.ts';

import { fetchPage, fetchPages } from './fetch.ts';

const response = (status: number, body = ''): Awaited<ReturnType<FetchLike>> => ({
	ok: status >= 200 && status < 300,
	status,
	text: () => Promise.resolve(body),
});

const answer = (status: number, body = '') => Promise.resolve(response(status, body));

const noSleep = () => Promise.resolve();

describe('fetchPage', () => {
	test('[fetch-001] returns the body and identifies itself', async () => {
		const seen: Record<string, string>[] = [];
		const fetchImpl: FetchLike = (_url, init) => {
			seen.push(init.headers);
			return answer(200, '<p>ok</p>');
		};
		await expect(fetchPage('https://example.com/a', { fetchImpl, sleep: noSleep })).resolves.toStrictEqual({
			status: 'ok',
			html: '<p>ok</p>',
		});
		expect(seen[0]?.['User-Agent']).toMatch(/markuplint/);
	});

	test('[fetch-002] gives up on a 404 without retrying', async () => {
		let calls = 0;
		const fetchImpl: FetchLike = () => {
			calls++;
			return answer(404);
		};
		await expect(fetchPage('https://example.com/a', { fetchImpl, sleep: noSleep })).resolves.toStrictEqual({
			status: 'failed',
			message: 'HTTP 404',
			permanent: true,
		});
		expect(calls).toBe(1);
	});

	test('[fetch-008] treats 410 Gone like 404, and a 403 or a 429 as something that may pass', async () => {
		let calls = 0;
		const status = { current: 410 };
		const fetchImpl: FetchLike = () => {
			calls++;
			return answer(status.current);
		};
		await expect(fetchPage('https://example.com/a', { fetchImpl, sleep: noSleep })).resolves.toStrictEqual({
			status: 'failed',
			message: 'HTTP 410',
			permanent: true,
		});
		expect(calls).toBe(1);

		for (const code of [403, 429]) {
			calls = 0;
			status.current = code;
			await expect(fetchPage('https://example.com/a', { fetchImpl, sleep: noSleep })).resolves.toStrictEqual({
				status: 'failed',
				message: `HTTP ${code}`,
			});
			expect(calls).toBe(3);
		}
	});

	test('[fetch-003] retries a server error with a growing delay and then succeeds', async () => {
		const answers = [503, 502, 200];
		const delays: number[] = [];
		const fetchImpl: FetchLike = () => answer(answers.shift() ?? 500, 'fine');
		const result = await fetchPage('https://example.com/a', {
			fetchImpl,
			sleep: ms => {
				delays.push(ms);
				return Promise.resolve();
			},
			delayMs: 100,
		});
		expect(result).toStrictEqual({ status: 'ok', html: 'fine' });
		expect(delays).toStrictEqual([100, 200]);
	});

	test('[fetch-004] reports the last error once the retries are used up', async () => {
		let calls = 0;
		const fetchImpl: FetchLike = () => {
			calls++;
			return answer(503);
		};
		await expect(
			fetchPage('https://example.com/a', { fetchImpl, sleep: noSleep, retries: 3 }),
		).resolves.toStrictEqual({ status: 'failed', message: 'HTTP 503' });
		expect(calls).toBe(3);
	});

	test('[fetch-005] turns a network failure into a failed result', async () => {
		const fetchImpl: FetchLike = () =>
			Promise.reject(new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND example.com') }));
		await expect(
			fetchPage('https://example.com/a', { fetchImpl, sleep: noSleep, retries: 1 }),
		).resolves.toStrictEqual({
			status: 'failed',
			message: 'fetch failed (getaddrinfo ENOTFOUND example.com)',
		});
	});
});

describe('fetchPages', () => {
	test('[fetch-006] fetches each distinct URL once, keyed by URL', async () => {
		const urls: string[] = [];
		const fetchImpl: FetchLike = url => {
			urls.push(url);
			return answer(200, url);
		};
		const pages = await fetchPages(['https://example.com/a', 'https://example.com/b', 'https://example.com/a'], {
			fetchImpl,
			sleep: noSleep,
		});
		expect([...pages.keys()].toSorted()).toStrictEqual(['https://example.com/a', 'https://example.com/b']);
		expect(urls.toSorted()).toStrictEqual(['https://example.com/a', 'https://example.com/b']);
	});

	test('[fetch-007] never runs more requests at once than the concurrency allows', async () => {
		let running = 0;
		let peak = 0;
		const fetchImpl: FetchLike = async () => {
			running++;
			peak = Math.max(peak, running);
			await new Promise(resolve => setTimeout(resolve, 5));
			running--;
			return response(200);
		};
		const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/${i}`);
		await fetchPages(urls, { fetchImpl, sleep: noSleep, concurrency: 3 });
		expect(peak).toBe(3);
	});
});
