import { createRule } from '@markuplint/ml-core';
import { isVoidElement } from '@markuplint/ml-spec';

import meta from './meta.js';

/**
 * HTML LS "in body" insertion mode, "An end-of-file token":
 *
 * > If there is a node in the stack of open elements that is not either a dd
 * > element, a dt element, an li element, an optgroup element, an option
 * > element, a p element, an rb element, an rp element, an rt element, an
 * > rtc element, a tbody element, a td element, a tfoot element, a th
 * > element, a thead element, a tr element, the body element, or the html
 * > element, then this is a parse error.
 *
 * Every name in that list has its own optional-tag-omission rule elsewhere in
 * the spec, so parse5 never records an explicit end tag for it even in
 * well-formed documents; excluding them keeps this rule from re-flagging
 * markup that `end-tag` (a style preference, not this spec-conformance rule)
 * already tolerates. Anything else still open when the source runs out —
 * e.g. `<picture>`, which has no such omission rule — is this parse error.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
 */
const EOF_EXEMPT_NAMES = new Set([
	'dd',
	'dt',
	'li',
	'optgroup',
	'option',
	'p',
	'rb',
	'rp',
	'rt',
	'rtc',
	'tbody',
	'td',
	'tfoot',
	'th',
	'thead',
	'tr',
	'body',
	'html',
]);

type EndAnchored = {
	readonly raw: string;
	readonly startOffset: number;
	readonly closeTag?: { readonly raw: string; readonly startOffset: number } | null;
	readonly childNodes?: Iterable<EndAnchored>;
};

/**
 * The end offset of a node's own content, following the last descendant to
 * its end when the node itself has no end tag. Elements without an explicit
 * end tag only carry a start-tag span in `raw`/`startOffset`
 * (`@markuplint/html-parser`'s `nodeize`), so their children's own closing
 * position is the only way to find where the element's content actually
 * ends in the source.
 */
function deepEndOffset(node: EndAnchored): number {
	if (node.closeTag) {
		return node.closeTag.startOffset + node.closeTag.raw.length;
	}
	const last = node.childNodes ? [...node.childNodes].at(-1) : undefined;
	if (last) {
		return deepEndOffset(last);
	}
	return node.startOffset + node.raw.length;
}

export default createRule<boolean>({
	meta: meta,
	async verify({ document, report, t }) {
		/**
		 * A parser with `endTagType: 'never'` (e.g. `@markuplint/pug-parser`)
		 * structurally never records a close tag for any element, so
		 * `el.closeTag == null` carries no signal about whether the source is
		 * actually malformed — see `require-end-tag`'s identical guard for the
		 * same rationale.
		 */
		if (document.endTag === 'never') {
			return;
		}

		const eof = document.raw.length;

		await document.walkOn('Element', el => {
			if (el.isOmitted) return;
			if (isVoidElement(el)) return;
			if (el.closeTag != null) return;
			if (EOF_EXEMPT_NAMES.has(el.localName)) return;

			// Only the case where nothing but whitespace follows is the EOF
			// case this rule targets — content implicitly closing the element
			// mid-document (e.g. a sibling autoclosing it) is out of scope.
			const contentEnd = deepEndOffset(el);
			if (document.raw.slice(contentEnd, eof).trim() !== '') return;

			report({
				scope: el,
				message: t('{0} is not closed at the end of the file', t('the "{0}" {1}', el.localName, 'element')),
			});
		});
	},
});
