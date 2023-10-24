export function isDocumentFragment(html: string) {
	return !/^\s*(<!doctype html(?:\s*.+)?>|<html[\s>])/im.test(html);
}
