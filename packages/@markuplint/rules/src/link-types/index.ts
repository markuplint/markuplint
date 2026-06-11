import type { Element } from '@markuplint/ml-core';
import type { Translator } from '@markuplint/i18n';

import { createRule } from '@markuplint/ml-core';
import {
	DEF_LINK_TYPE_WHATWG,
	ALLOWED_LINK_TYPE_MICROFORMATS,
	DEF_LINK_TYPE_MICROFORMATS_DROPPED,
	DEF_LINK_TYPE_MICROFORMATS_DROPPED_WITHOUT_PREJUDICE,
	DEF_LINK_TYPE_MICROFORMATS_REJECTED,
	DEF_LINK_TYPE_MICROFORMATS_NON_HTML_REL_VALUES,
} from '@markuplint/types';

import meta from './meta.js';

type Options = {
	readonly allowMicroformats?: boolean | readonly string[];
};

type ElementContext = 'link' | 'body-link' | 'a-area' | 'form';

const TARGET_ELEMENTS = new Set(['link', 'a', 'area', 'form']);

export default createRule<boolean, Options>({
	meta: meta,
	defaultOptions: {
		allowMicroformats: false,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (!TARGET_ELEMENTS.has(el.localName)) {
				return;
			}

			const relAttr = el.getAttributeNode('rel');
			if (!relAttr) {
				return;
			}

			if (relAttr.isDynamicValue) {
				return;
			}

			const tokenList = relAttr.tokenList;
			if (!tokenList || tokenList.length === 0) {
				return;
			}

			const context = getElementContext(el);
			if (!context) {
				return;
			}

			const options = el.rule.options;

			for (const tokenInfo of tokenList.allTokens()) {
				const keyword = tokenInfo.raw;
				const keywordLower = keyword.toLowerCase();

				const message = validateKeyword(keywordLower, context, options, t);

				if (message) {
					report({
						scope: el,
						line: tokenInfo.startLine,
						col: tokenInfo.startCol,
						raw: keyword,
						message,
					});
				}
			}
		});
	},
});

function getElementContext(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
): ElementContext | null {
	const tagName = el.localName;

	switch (tagName) {
		case 'link': {
			if (el.closest('body') !== null) {
				return 'body-link';
			}
			return 'link';
		}
		case 'a':
		case 'area': {
			return 'a-area';
		}
		case 'form': {
			return 'form';
		}
		default: {
			return null;
		}
	}
}

function validateKeyword(
	keyword: string,
	context: ElementContext,

	options: Options,
	t: Translator,
): string | null {
	// Check WHATWG standard keywords
	const whatwgDef = DEF_LINK_TYPE_WHATWG.find(def => def.keyword.toLowerCase() === keyword);
	if (whatwgDef) {
		return validateWhatwgKeyword(whatwgDef, context, t);
	}

	// Check dropped keywords
	if (DEF_LINK_TYPE_MICROFORMATS_DROPPED.some(def => def.keyword.toLowerCase() === keyword)) {
		return t('{0} is {1:c}', `"${keyword}"`, 'dropped');
	}

	// Check dropped without prejudice keywords
	if (DEF_LINK_TYPE_MICROFORMATS_DROPPED_WITHOUT_PREJUDICE.some(def => def.keyword.toLowerCase() === keyword)) {
		return t('{0} is {1:c}', `"${keyword}"`, 'dropped');
	}

	// Check rejected keywords
	if (DEF_LINK_TYPE_MICROFORMATS_REJECTED.some(def => def.keyword.toLowerCase() === keyword)) {
		return t('{0} is {1:c}', `"${keyword}"`, 'rejected');
	}

	// Check non-HTML rel values
	if (DEF_LINK_TYPE_MICROFORMATS_NON_HTML_REL_VALUES.some(def => def.keyword.toLowerCase() === keyword)) {
		return t('{0} is {1:c}', `"${keyword}"`, 'not allowed');
	}

	// Handle Microformats
	const { allowMicroformats } = options;

	if (allowMicroformats === false || allowMicroformats === undefined) {
		return t('The "{0*}" {1} is {2:c}', keyword, 'keyword', 'not allowed');
	}

	if (allowMicroformats === true) {
		return validateMicroformatKeyword(keyword, context, t);
	}

	// allowMicroformats is string[]
	if (Array.isArray(allowMicroformats)) {
		const isAllowed = allowMicroformats.some(allowed => allowed.toLowerCase() === keyword);
		if (!isAllowed) {
			return t('The "{0*}" {1} is {2:c}', keyword, 'keyword', 'not allowed');
		}

		// Even if in the allow list, check element context
		const microDef = ALLOWED_LINK_TYPE_MICROFORMATS.find(def => def.keyword.toLowerCase() === keyword);
		if (microDef) {
			return validateMicroformatContext(microDef, context, t);
		}

		// Keyword is in the user's allow list but not in any registry — allow it
		return null;
	}

	return null;
}

function validateWhatwgKeyword(
	def: (typeof DEF_LINK_TYPE_WHATWG)[number],
	context: ElementContext,
	t: Translator,
): string | null {
	switch (context) {
		case 'link': {
			if (def.link === 'not allowed') {
				return t('The "{0*}" {1} is not allowed on the {2}', def.keyword, 'keyword', '"link" element');
			}
			return null;
		}
		case 'body-link': {
			if (def.link === 'not allowed') {
				return t('The "{0*}" {1} is not allowed on the {2}', def.keyword, 'keyword', '"link" element');
			}
			if (def.bodyOk !== 'Yes') {
				return t(
					'The "{0*}" {1} is not allowed on the {2} inside the {3}',
					def.keyword,
					'keyword',
					'"link" element',
					'"body" element',
				);
			}
			return null;
		}
		case 'a-area': {
			if (def.a === 'not allowed') {
				return t('The "{0*}" {1} is not allowed on the {2}', def.keyword, 'keyword', '"a" element');
			}
			return null;
		}
		case 'form': {
			if (def.form === 'not allowed') {
				return t('The "{0*}" {1} is not allowed on the {2}', def.keyword, 'keyword', '"form" element');
			}
			return null;
		}
	}
}

function validateMicroformatKeyword(keyword: string, context: ElementContext, t: Translator): string | null {
	const microDef = ALLOWED_LINK_TYPE_MICROFORMATS.find(def => def.keyword.toLowerCase() === keyword);
	if (!microDef) {
		return t('The "{0*}" {1} is {2:c}', keyword, 'keyword', 'not allowed');
	}
	return validateMicroformatContext(microDef, context, t);
}

function validateMicroformatContext(
	def: (typeof ALLOWED_LINK_TYPE_MICROFORMATS)[number],
	context: ElementContext,
	t: Translator,
): string | null {
	switch (context) {
		case 'link':
		case 'body-link': {
			if (!def.link) {
				return t('The "{0*}" {1} is not allowed on the {2}', def.keyword, 'keyword', '"link" element');
			}
			return null;
		}
		case 'a-area': {
			if (!def.a) {
				return t('The "{0*}" {1} is not allowed on the {2}', def.keyword, 'keyword', '"a" element');
			}
			return null;
		}
		case 'form': {
			// Microformats don't define form context; reject
			return t('The "{0*}" {1} is not allowed on the {2}', def.keyword, 'keyword', '"form" element');
		}
	}
}
