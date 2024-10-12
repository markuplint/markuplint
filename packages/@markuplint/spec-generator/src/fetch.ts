import * as cheerio from 'cheerio';
import { Bar, Presets } from 'cli-progress';

const cache = new Map<string, string>();
const domCache = new Map<string, cheerio.Root>();

let total = 1;
let current = 0;
const bar = new Bar(
	{
		format: '🔎 Fetch references... {bar} {percentage}% | ETA: {eta}s | {value}/{total} {process}',
	},
	Presets.shades_grey,
);
bar.start(total, current, { process: '🚀 Started.' });

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
	bar.setTotal(total);
	let text = '';
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
	bar.update(current, { process: `🔗 ${url.length > 30 ? `${url.slice(0, 15)}...${url.slice(-15)}` : url}` });
	return text;
}

export function getReferences() {
	current += 1;
	bar.update(current, { process: '🎉 Finished.' });
	bar.stop();
	return [...cache.keys()].sort();
}
