import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Content whose element is one of these has RAWTEXT/RCDATA parsing (HTML LS
 * "generic raw text element parsing algorithm" / "generic RCDATA element
 * parsing algorithm"): the parser never re-tokenizes tag-shaped substrings
 * inside it, so a literal `<body` or `</head` there is ordinary text, not a
 * candidate for either check below.
 */
const RAW_TEXT_CONTAINERS = new Set(['script', 'style', 'title', 'textarea', 'xmp']);

const STRAY_HEAD_END_TAG = /<\/head(?=[\s/>])/i;
const DUPLICATE_BODY_START_TAG = /<body(?=[\s/>])/i;

/**
 * HTML LS "in body" insertion mode:
 *
 * > A start tag whose tag name is "body": Parse error. If the stack of open
 * > elements has only one node on it, or if the second element on the stack
 * > of open elements is not a body element, or if there is a template
 * > element on the stack of open elements, then ignore the token […].
 * > Otherwise, set the frameset-ok flag to "not ok" […]
 *
 * "in body" insertion mode, "Any other end tag":
 *
 * > Initialize node to be the current node […]. If node's tag name […] is
 * > not the same as the tag name of the token, then this is a parse error.
 *
 * Neither of these fires by the presence of disallowed `<head>` content
 * itself (the "in head" insertion mode's own "Anything else" clause that
 * pops an implicitly-invalid element out of head carries no "parse error"
 * wording) — they fire only when the *source* still contains a literal
 * `</head>` or `<body>` token that arrives once the parser has moved on.
 * `@markuplint/html-parser`'s `nodeize` folds a token the tree constructor
 * discards into the surrounding text node's `raw` span rather than
 * dropping the bytes, so a genuinely-consumed stray/duplicate tag survives
 * as plain text content — this rule looks for exactly that residue.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
 */
export default createRule<boolean>({
	meta: meta,
	async verify({ document, report, t }) {
		await document.walkOn('Text', text => {
			const parent = text.parentNode;
			const parentLocalName = parent && 'localName' in parent ? parent.localName : '';
			if (RAW_TEXT_CONTAINERS.has(parentLocalName)) return;

			if (STRAY_HEAD_END_TAG.test(text.raw)) {
				report({
					scope: text,
					message: t('{0} detected', t('a stray "{0}" end tag', 'head')),
				});
			}

			if (DUPLICATE_BODY_START_TAG.test(text.raw)) {
				report({
					scope: text,
					message: t('{0} detected', t('a duplicate "{0}" start tag', 'body')),
				});
			}
		});
	},
});
