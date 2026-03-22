import * as cheerio from 'cheerio';
import { Bar, Presets } from 'cli-progress';

/**
 * Whether the process is running in a CI environment.
 */
const isCI = Boolean(process.env.CI);

/**
 * Maximum number of retry attempts for failed fetches.
 */
const MAX_RETRIES = 3;

/**
 * Base delay in milliseconds for exponential backoff between retries.
 */
const RETRY_BASE_DELAY_MS = 1000;

/**
 * User-Agent header sent with all fetch requests.
 */
const USER_AGENT = 'markuplint-spec-generator (https://github.com/markuplint/markuplint)';

/**
 * In-memory cache mapping URLs to their raw HTML text responses.
 */
const cache = new Map<string, string>();

/**
 * In-memory cache mapping URLs to their parsed Cheerio DOM instances.
 */
const domCache = new Map<string, cheerio.CheerioAPI>();

/**
 * URLs that failed to fetch successfully.
 */
const failedUrls: string[] = [];

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
 * Fetches a URL and returns a parsed Cheerio DOM instance.
 * Results are cached so subsequent calls with the same URL avoid re-fetching and re-parsing.
 *
 * @param url - The URL to fetch and parse as HTML
 * @returns A Cheerio API instance for querying the fetched document
 */
export async function fetch(url: string) {
	if (domCache.has(url)) {
		return domCache.get(url)!;
	}
	const html = await fetchText(url);
	const $ = cheerio.load(html);
	domCache.set(url, $);
	return $;
}

/**
 * Fetches the raw text content of a URL with retry logic and status code validation.
 * Results are cached so repeated requests for the same URL return the cached response.
 * Updates the CLI progress bar on each call.
 *
 * @param url - The URL to fetch
 * @returns The raw text content of the HTTP response, or an empty string on failure
 */
export async function fetchText(url: string) {
	total += 1;
	bar?.setTotal(total);
	let text: string;
	if (cache.has(url)) {
		text = cache.get(url)!;
	} else {
		text = '';
		for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
			try {
				const res = await globalThis.fetch(url, {
					headers: { 'User-Agent': USER_AGENT },
				});
				if (!res.ok) {
					// eslint-disable-next-line no-console
					console.error(
						`⚠️ Fetch failed: ${url} (HTTP ${res.status} ${res.statusText}, attempt ${attempt}/${MAX_RETRIES})`,
					);
					if (res.status === 404 || attempt >= MAX_RETRIES) {
						failedUrls.push(url);
						break;
					}
					await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
					continue;
				}
				text = await res.text();
				break;
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(
					`⚠️ Fetch error: ${url} (${error instanceof Error ? error.message : String(error)}, attempt ${attempt}/${MAX_RETRIES})`,
				);
				if (attempt < MAX_RETRIES) {
					await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
					continue;
				}
				failedUrls.push(url);
			}
		}
		cache.set(url, text);
	}
	current += 1;
	bar?.update(current, { process: `🔗 ${url.length > 30 ? `${url.slice(0, 15)}...${url.slice(-15)}` : url}` });
	return text;
}

/**
 * Finalizes the fetch progress bar and returns a sorted list of all URLs that were fetched.
 * Should be called after all fetch operations are complete.
 *
 * @returns A sorted array of all fetched URL strings (used as reference citations)
 */
export function getReferences() {
	current += 1;
	bar?.update(current, { process: '🎉 Finished.' });
	bar?.stop();
	return [...cache.keys()].toSorted();
}

/**
 * Returns the list of URLs that failed to fetch after all retries.
 */
export function getFailedUrls(): readonly string[] {
	return failedUrls;
}

function delay(ms: number) {
	return new Promise<void>(resolve => {
		setTimeout(resolve, ms);
	});
}
