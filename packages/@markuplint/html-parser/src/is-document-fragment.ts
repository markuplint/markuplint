/**
 * Only input that explicitly opens with a doctype or `<html` is treated as a
 * document; everything else is a fragment. The distinction matters because
 * parse5's `parse()` applies the HTML standard's full document parsing
 * algorithm — inserting implicit `<html>`, `<head>`, and `<body>` — while
 * `parseFragment()` parses the content as-is.
 */
export function isDocumentFragment(html: string) {
	return !/^\s*(?:<!doctype html(?:\s*(?:\S.*|[\t\v\f \u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]))?>|<html[\s>])/im.test(
		html,
	);
}
