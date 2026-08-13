import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * HTML LS "after body" insertion mode:
 *
 * > An end-of-file token: Stop parsing.
 * >
 * > Anything else: Parse error. Switch the insertion mode to "in body" and
 * > reprocess the token.
 *
 * Whitespace characters (U+0009/000A/000C/000D/0020) have their own case one
 * step above ("process using the rules for the 'in body' insertion mode"
 * without the parse error), so a trailing newline after `</body>` is normal
 * and out of scope here — only a start tag or non-whitespace text reaching
 * this insertion mode is the "Anything else" parse error. Because the
 * reprocessing switches back to "in body", the offending content still ends
 * up nested inside `<body>` in the resulting tree even though, in the
 * source, it appears after `<body>`'s own end tag.
 *
 * Scoped to `<body>`'s direct children: anything deeper (e.g. text inside a
 * later `<script>`) is that descendant's own content, not a stray token that
 * arrived after the body boundary closed.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterbody
 */
export default createRule<boolean>({
	meta: meta,
	verify({ document, report, t }) {
		const body = document.querySelector('body');
		if (!body?.closeTag) return;

		const bodyCloseEnd = body.closeTag.startOffset + body.closeTag.raw.length;

		for (const child of body.childNodes) {
			if (child.startOffset < bodyCloseEnd) continue;

			if (child.is(child.ELEMENT_NODE)) {
				report({
					scope: child,
					message: t('Content after the end tag of the "{0}" element is not allowed', 'body'),
				});
				continue;
			}

			if (child.is(child.TEXT_NODE) && child.raw.trim() !== '') {
				report({
					scope: child,
					message: t('Content after the end tag of the "{0}" element is not allowed', 'body'),
				});
			}
		}
	},
});
