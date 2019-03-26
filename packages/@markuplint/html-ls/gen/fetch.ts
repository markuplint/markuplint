import fetch from 'node-fetch';
import cheerio from 'cheerio';

const cache = new Map<string, string>();

export default async function(url: string) {
	const html = await fetchText(url);
	const $ = cheerio.load(html);
	return $;
}

export async function fetchText(url: string) {
	let text = '';
	if (cache.has(url)) {
		text = cache.get(url)!;
	} else {
		const res = await fetch(url);
		text = await res.text();
		cache.set(url, text);
	}
	return text;
}

export function getReferences() {
	return Array.from(cache.keys()).sort();
}
