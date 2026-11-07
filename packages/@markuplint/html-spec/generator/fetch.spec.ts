import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest';

// The module keeps what it fetched in module state: each test imports a fresh copy.
function load() {
	vi.resetModules();
	return import('./fetch.ts');
}

function stubFetch(status: Readonly<Record<string, number>>) {
	const fetchMock = vi.fn((url: string) => {
		const code = status[url] ?? 200;
		return Promise.resolve(new Response(code === 200 ? `<p>${url}</p>` : '', { status: code }));
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('hasFetchProblems', () => {
	test('is false when every page answered or answered 404 as expected', async () => {
		stubFetch({ 'https://example.com/gone': 404 });
		const { fetchText, hasFetchProblems } = await load();

		await fetchText('https://example.com/found');
		await fetchText('https://example.com/gone', { expectNotFound: true });

		expect(hasFetchProblems()).toBe(false);
	});

	test('is true when a page failed to fetch', async () => {
		stubFetch({ 'https://example.com/missing': 404 });
		const { fetchText, hasFetchProblems } = await load();

		await fetchText('https://example.com/missing');

		expect(hasFetchProblems()).toBe(true);
	});

	test('is true when a page expected not to exist answered', async () => {
		stubFetch({});
		const { fetchText, hasFetchProblems } = await load();

		await fetchText('https://example.com/back', { expectNotFound: true });

		expect(hasFetchProblems()).toBe(true);
	});
});

describe('fetchText', () => {
	test('reports a page that answers 404 as a failure, and leaves it out of the references', async () => {
		stubFetch({ 'https://example.com/missing': 404 });
		const { fetchText, getFailedUrls, getReferences } = await load();

		expect(await fetchText('https://example.com/found')).toBe('<p>https://example.com/found</p>');
		expect(await fetchText('https://example.com/missing')).toBe('');

		expect(getFailedUrls()).toStrictEqual(['https://example.com/missing']);
		expect(getReferences()).toStrictEqual(['https://example.com/found']);
		expect(errorSpy).toHaveBeenCalledWith('⚠️ Fetch failed: https://example.com/missing (HTTP 404)');
	});

	test('fetches and reports a page requested again while its first request is in flight once', async () => {
		const fetchMock = stubFetch({ 'https://example.com/missing': 404 });
		const { fetchText, getFailedUrls } = await load();

		await Promise.all([fetchText('https://example.com/missing'), fetchText('https://example.com/missing')]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(getFailedUrls()).toStrictEqual(['https://example.com/missing']);
	});

	test('does not fetch a page that answered 404 again', async () => {
		const fetchMock = stubFetch({ 'https://example.com/missing': 404 });
		const { fetchText } = await load();

		await fetchText('https://example.com/missing');
		await fetchText('https://example.com/missing');

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test('keeps a page that failed for a reason other than 404 in the references', async () => {
		vi.useFakeTimers();
		stubFetch({ 'https://example.com/down': 503 });
		const { fetchText, getFailedUrls, getReferences } = await load();

		const text = fetchText('https://example.com/down');
		await vi.runAllTimersAsync();

		expect(await text).toBe('');
		expect(getFailedUrls()).toStrictEqual(['https://example.com/down']);
		expect(getReferences()).toStrictEqual(['https://example.com/down']);
	});

	test('does not report a 404 that is expected, and leaves it out of the references', async () => {
		stubFetch({ 'https://example.com/gone': 404 });
		const { fetchText, getFailedUrls, getReferences, getUnexpectedlyFoundUrls } = await load();

		expect(await fetchText('https://example.com/gone', { expectNotFound: true })).toBe('');

		expect(getFailedUrls()).toStrictEqual([]);
		expect(getUnexpectedlyFoundUrls()).toStrictEqual([]);
		expect(getReferences()).toStrictEqual([]);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	test('reports a page expected not to exist that failed for a reason other than 404, and leaves it out of the references', async () => {
		vi.useFakeTimers();
		stubFetch({ 'https://example.com/gone': 503 });
		const { fetchText, getFailedUrls, getReferences } = await load();

		const text = fetchText('https://example.com/gone', { expectNotFound: true });
		await vi.runAllTimersAsync();

		expect(await text).toBe('');
		expect(getFailedUrls()).toStrictEqual(['https://example.com/gone']);
		expect(getReferences()).toStrictEqual([]);
	});

	test('reads and reports a page that answers although it is expected not to exist', async () => {
		stubFetch({});
		const { fetchText, getFailedUrls, getReferences, getUnexpectedlyFoundUrls } = await load();

		expect(await fetchText('https://example.com/back', { expectNotFound: true })).toBe(
			'<p>https://example.com/back</p>',
		);

		expect(getFailedUrls()).toStrictEqual([]);
		expect(getUnexpectedlyFoundUrls()).toStrictEqual(['https://example.com/back']);
		expect(getReferences()).toStrictEqual(['https://example.com/back']);
	});
});
