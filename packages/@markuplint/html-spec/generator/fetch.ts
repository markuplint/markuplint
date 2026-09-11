import * as cheerio from 'cheerio';
import { Bar, Presets } from 'cli-progress';

const isCI = Boolean(process.env.CI);

const MAX_RETRIES = 3;

const RETRY_BASE_DELAY_MS = 1000;

const USER_AGENT = 'markuplint-html-spec-generator (https://github.com/markuplint/markuplint)';

const cache = new Map<string, string>();

const domCache = new Map<string, cheerio.CheerioAPI>();

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

export async function fetch(url: string) {
	if (domCache.has(url)) {
		return domCache.get(url)!;
	}
	const html = await fetchText(url);
	const $ = cheerio.load(html);
	domCache.set(url, $);
	return $;
}

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
 * Must be called only after all fetch operations are complete: the returned
 * URLs become the spec's reference citations.
 */
export function getReferences() {
	current += 1;
	bar?.update(current, { process: '🎉 Finished.' });
	bar?.stop();
	return [...cache.keys()].toSorted();
}

export function getFailedUrls(): readonly string[] {
	return failedUrls;
}

function delay(ms: number) {
	return new Promise<void>(resolve => {
		setTimeout(resolve, ms);
	});
}
