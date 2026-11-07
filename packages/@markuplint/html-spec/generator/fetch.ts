import * as cheerio from 'cheerio';
import { Bar, Presets } from 'cli-progress';

const isCI = Boolean(process.env.CI);

const MAX_RETRIES = 3;

const RETRY_BASE_DELAY_MS = 1000;

const USER_AGENT = 'markuplint-html-spec-generator (https://github.com/markuplint/markuplint)';

const cache = new Map<string, Promise<string>>();

const domCache = new Map<string, cheerio.CheerioAPI>();

const failedUrls = new Set<string>();

/**
 * URLs that are no reference: those that answered 404 (unlike a failure that a
 * later run may not repeat, such as a network error or a 5xx, the page does not
 * exist), and those fetched with `expectNotFound` that gave no page for any
 * reason (they are not in `cites` normally, so an outage must not add them).
 */
const unreferencedUrls = new Set<string>();

/**
 * URLs fetched with `expectNotFound` that answered with a page.
 */
const unexpectedlyFoundUrls = new Set<string>();

let total = 1;
let current = 0;

const bar = isCI
	? null
	: new Bar(
			{
				format: '🔎 Fetch references... {bar} {percentage}% | ETA: {eta}s | {value}/{total} {process}',
			},
			Presets.shades_grey,
		);
bar?.start(total, current, { process: '🚀 Started.' });

/**
 * Options of `fetch` and `fetchText`.
 */
export type FetchOptions = {
	/**
	 * The page is known not to exist: a 404 is not a failure. A page that
	 * answers is still read, and is reported by `getUnexpectedlyFoundUrls`.
	 */
	readonly expectNotFound?: boolean;
};

export async function fetch(url: string, options?: FetchOptions) {
	if (domCache.has(url)) {
		return domCache.get(url)!;
	}
	const html = await fetchText(url, options);
	const $ = cheerio.load(html);
	domCache.set(url, $);
	return $;
}

/**
 * The request for a URL is cached, not its result: the generator fetches in
 * parallel (`h1` to `h6` share one MDN page), and a URL requested again while
 * its first request is in flight must not be fetched, or reported, twice.
 */
export async function fetchText(url: string, options?: FetchOptions) {
	total += 1;
	bar?.setTotal(total);
	let request = cache.get(url);
	if (!request) {
		request = download(url, options);
		cache.set(url, request);
	}
	const text = await request;
	current += 1;
	bar?.update(current, { process: `🔗 ${url.length > 30 ? `${url.slice(0, 15)}...${url.slice(-15)}` : url}` });
	return text;
}

/**
 * Resolves to the empty string when the URL gives no page.
 */
async function download(url: string, options: FetchOptions | undefined) {
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			const res = await globalThis.fetch(url, {
				headers: { 'User-Agent': USER_AGENT },
			});
			if (res.status === 404) {
				unreferencedUrls.add(url);
				if (!options?.expectNotFound) {
					// eslint-disable-next-line no-console
					console.error(`⚠️ Fetch failed: ${url} (${httpStatus(res)})`);
					failedUrls.add(url);
				}
				return '';
			}
			if (!res.ok) {
				// eslint-disable-next-line no-console
				console.error(`⚠️ Fetch failed: ${url} (${httpStatus(res)}, attempt ${attempt}/${MAX_RETRIES})`);
				if (attempt < MAX_RETRIES) {
					await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
					continue;
				}
				break;
			}
			const text = await res.text();
			if (options?.expectNotFound) {
				unexpectedlyFoundUrls.add(url);
			}
			return text;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(
				`⚠️ Fetch error: ${url} (${error instanceof Error ? error.message : String(error)}, attempt ${attempt}/${MAX_RETRIES})`,
			);
			if (attempt < MAX_RETRIES) {
				await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
				continue;
			}
		}
	}
	failedUrls.add(url);
	if (options?.expectNotFound) {
		unreferencedUrls.add(url);
	}
	return '';
}

function httpStatus(res: Readonly<Response>) {
	return res.statusText ? `HTTP ${res.status} ${res.statusText}` : `HTTP ${res.status}`;
}

/**
 * Must be called only after all fetch operations are complete: the returned
 * URLs become the spec's reference citations. A URL that gave no page is
 * cached as an empty page so that it is not fetched again. Whether it is a
 * reference is decided so that an outage does not change `index.json`: a URL
 * that failed for a reason other than 404 keeps the place it normally has (in
 * `cites`, unless it is fetched with `expectNotFound`), and the failure is
 * reported by `getFailedUrls`.
 */
export function getReferences() {
	current += 1;
	bar?.update(current, { process: '🎉 Finished.' });
	bar?.stop();
	return [...cache.keys()].filter(url => !unreferencedUrls.has(url)).toSorted();
}

export function getFailedUrls(): readonly string[] {
	return [...failedUrls];
}

export function getUnexpectedlyFoundUrls(): readonly string[] {
	return [...unexpectedlyFoundUrls];
}

/**
 * Whether a fetch failed or a page expected not to exist answered: either one
 * needs a person, so the generation exits non-zero (`build.ts`).
 */
export function hasFetchProblems() {
	return failedUrls.size > 0 || unexpectedlyFoundUrls.size > 0;
}

function delay(ms: number) {
	return new Promise<void>(resolve => {
		setTimeout(resolve, ms);
	});
}
