/**
 * The documents the comparison lints: one page shell around a number of blocks, each of which
 * mixes what the rules look at — headings and landmarks, lists, a table, a form with labels,
 * media, ARIA references by id (`aria-labelledby`, `aria-controls`) and a few violations — so that
 * the rules that resolve references across the document scale with its size as they do on a real
 * page.
 */

/** The config both engines lint with. */
export const CONFIG = { extends: ['markuplint:recommended'] };

/** The sizes, by the number of blocks. */
export const SIZES = {
	small: 2,
	medium: 50,
	large: 500,
} as const;

export type SizeName = keyof typeof SIZES;

function block(i: number) {
	const day = String((i % 28) + 1).padStart(2, '0');
	return `
<section aria-labelledby="h-${i}" class="card card--${i % 3}">
	<h2 id="h-${i}">Section ${i}: Lorem ipsum dolor sit amet</h2>
	<p>Consectetur <a href="https://example.com/p/${i}">adipiscing elit</a>, sed do <strong>eiusmod</strong> tempor <em>incididunt</em> ut labore et dolore magna aliqua. <time datetime="2026-01-${day}">Jan ${(i % 28) + 1}</time></p>
	<figure>
		<img src="/img/${i}.png" alt="Figure ${i}" width="640" height="360" loading="lazy">
		<figcaption>Figure ${i}</figcaption>
	</figure>
	<ul>
		<li><a href="#a-${i}-1">Item one</a></li>
		<li><a href="#a-${i}-2">Item two</a></li>
		<li><button type="button" aria-expanded="false" aria-controls="panel-${i}">Toggle</button></li>
	</ul>
	<div id="panel-${i}" role="region" aria-label="Panel ${i}" hidden>
		<p>Hidden content ${i}</p>
	</div>
	<table>
		<caption>Table ${i}</caption>
		<thead><tr><th scope="col">Name</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead>
		<tbody>
			<tr><td>Alpha</td><td>${i}</td><td>px</td></tr>
			<tr><td>Beta</td><td>${i * 2}</td><td>em</td></tr>
			<tr><td>Gamma</td><td>${i * 3}</td><td>%</td></tr>
		</tbody>
	</table>
	<form action="/submit/${i}" method="post">
		<label for="name-${i}">Name</label>
		<input type="text" id="name-${i}" name="name" autocomplete="name" required>
		<label for="mail-${i}">Email</label>
		<input type="email" id="mail-${i}" name="email" autocomplete="email">
		<select name="choice" aria-label="Choice ${i}"><option value="a">A</option><option value="b">B</option></select>
		<button type="submit">Send</button>
	</form>
	<div class="legacy" style="color: red"><font>bad ${i}</font><img src="/x/${i}.png"></div>
	<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 22h20z" fill="currentColor"/></svg>
</section>`;
}

/**
 * The document of `blocks` blocks.
 *
 * @param blocks - The number of blocks
 * @returns The HTML source
 */
export function generate(blocks: number) {
	const body = Array.from({ length: blocks }, (_, i) => block(i)).join('\n');
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Benchmark page (${blocks} blocks)</title>
	<link rel="stylesheet" href="/style.css">
	<script type="module" src="/main.js"></script>
</head>
<body>
	<header>
		<nav aria-label="Global"><ul><li><a href="/">Home</a></li><li><a href="/about">About</a></li></ul></nav>
	</header>
	<main>
		<h1>Benchmark page</h1>
${body}
	</main>
	<footer><p><small>&copy; Example</small></p></footer>
</body>
</html>
`;
}
