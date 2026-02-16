import * as cheerio from 'cheerio';
import { Bar, Presets } from 'cli-progress';

/**
 * Whether the process is running in a CI environment.
 */
const isCI = Boolean(process.env.CI);

/**
 * In-memory cache mapping URLs to their raw HTML text responses.
 */
const cache = new Map<string, string>();

/**
 * In-memory cache mapping URLs to their parsed Cheerio DOM instances.
 */
const domCache = new Map<string, cheerio.CheerioAPI>();

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
 * Fetches the raw text content of a URL.
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
		try {
			const res = await globalThis.fetch(url);
			text = await res.text();
			cache.set(url, text);
		} catch {
			cache.set(url, '');
			text = '';
		}
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
