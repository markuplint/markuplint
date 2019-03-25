import fetch from 'node-fetch';
import cheerio from 'cheerio';

const cache = new Map<string, string>();

export default async function(url: string) {
	let html = '';
	if (cache.has(url)) {
		html = cache.get(url)!;
	} else {
		const res = await fetch(url);
		html = await res.text();
		cache.set(url, html);
	}
	const $ = cheerio.load(html);
	return $;
}

export function getReferences() {
	return Array.from(cache.keys());
}
