import test from 'ava';
import parser from '../lib/parser';

// test('standard', t => {
// 	const r = parser(`
// 	<!DOCTYPE html>
// 	<html lang="ja">
// 	<head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# website: http://ogp.me/ns/website#">
// 		<meta charset="UTF-8">
// 		<meta name="viewport" content="width=device-width">
// 		<title>TITLE</title>
// 		<meta name="description" content="DESCRIPTION">
// 		<meta property="og:type" content="website">
// 		<meta property="og:url" content="https://host/path/to">
// 		<meta property="og:image" content="/img/sns.png">
// 		<link rel="shortcut icon" href="/favicon.ico">
// 		<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
// 		<link rel="stylesheet" href="/css/style.css">
// 		<script src="/js/script.js" async></script>
// 	</head>
// 	<body role="document">
// 		<h1>HEADING</h1>
// 		<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Sunt exercitationem dignissimos nesciunt. Quo, sapiente. Impedit blanditiis, minus ducimus architecto quae deleniti quis ex sapiente rem ratione vitae, natus totam neque!</p>
// 	</body>
// 	</html>
// 	`);
// 	t.pass();
// });

// test('empty', t => {
// 	const r = parser(``);
// 	const e = [];
// 	r.walk((n) => e.push(n.nodeName));
// 	t.is(e.join(''), '');
// });

// test('doctype', t => {
// 	const r = parser(`<!doctype html>`);
// 	t.is(r.getNode(0).nodeName, '#doctype');
// 	t.is(r.getNode(0).publicId, null);
// 	t.is(r.getNode(0).dtd, null);
// });

// test('doctype', t => {
// 	const r = parser(`<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">`);
// 	t.is(r.getNode(0).publicId, '-//W3C//DTD HTML 4.01//EN');
// 	t.is(r.getNode(0).dtd, 'http://www.w3.org/TR/html4/strict.dtd');
// });

test('noop', t => t.pass());
