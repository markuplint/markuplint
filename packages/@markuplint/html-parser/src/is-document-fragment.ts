export function isDocumentFragment(html: string) {
	return !/^\s*(?:<!doctype html(?:\s*(?:\S.*|[\t\v\f \u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]))?>|<html[\s>])/im.test(
		html,
	);
}
