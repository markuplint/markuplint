import { createRule } from '@markuplint/ml-core';

import { decodeCharRef } from '../helpers';

type Bullets = string[];

type Options = {
	spaceNeededBullets?: string[];
};

export default createRule<Bullets, Options>({
	defaultValue: [
		/**
		 * @see https://en.wikipedia.org/wiki/Bullet_(typography)#In_Unicode
		 */
		'\u2022', // • BULLET (HTML &#8226; · &bull;, &bullet;)
		'\u2023', // ‣ TRIANGULAR BULLET (HTML &#8227;)
		'\u2043', // ⁃ HYPHEN BULLET (HTML &#8259; · &hybull;)
		'\u204C', // ⁌ BLACK LEFTWARDS BULLET (HTML &#8268;)
		'\u204D', // ⁍ BLACK RIGHTWARDS BULLET (HTML &#8269;)
		'\u2219', // ∙ BULLET OPERATOR (HTML &#8729;) for use in mathematical notation primarily as a dot product instead of interupt.
		'\u25CB', // ○ WHITE CIRCLE (HTML &#9675; · &cir;)
		'\u25CF', // ● BLACK CIRCLE (HTML &#9679;)
		'\u25D8', // ◘ INVERSE BULLET (HTML &#9688;)
		'\u25E6', // ◦ WHITE BULLET (HTML &#9702;)
		'\u2619', // ☙ REVERSED ROTATED FLORAL HEART BULLET (HTML &#9753;); see Fleuron (typography)
		'\u2765', // ❥ ROTATED HEAVY BLACK HEART BULLET (HTML &#10085;)
		'\u2767', // ❧ ROTATED FLORAL HEART BULLET (HTML &#10087;); see Fleuron (typography)
		'\u29BE', // ⦾ CIRCLED WHITE BULLET (HTML &#10686; · &olcir;)
		'\u29BF', // ⦿ CIRCLED BULLET (HTML &#10687; · &ofcir;)

		/**
		 * In Japanese
		 * @see https://ja.wikipedia.org/wiki/中黒#符号位置
		 */
		'\u00B7', // MIDDLE DOT
		'\u0387', // GREEK ANO TELIA
		'\u2022', // BULLET
		'\u2219', // BULLET OPERATOR
		'\u22C5', // DOT OPERATOR
		'\u30FB', // KATAKANA MIDDLE DOT
		'\uFF65', // HALFWIDTH KATAKANA MIDDLE DOT

		/**
		 * In Other Languages
		 */
		/* REQUEST WANTED: https://github.com/markuplint/markuplint/issues/new */

		/**
		 * From Markdown
		 */
		'-', // dashes
		'*', // asterisks
		'+', // plus signs
	],
	defaultOptions: {
		spaceNeededBullets: [
			/**
			 * From Markdown
			 */
			'-', // dashes
			'*', // asterisks
			'+', // plus signs
		],
	},
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Text', textNode => {
			const text = decodeCharRef(textNode.raw.trim());

			if (!text) {
				// empty
				return;
			}

			if (text.length === 1) {
				// character only
				return;
			}

			const bullets = textNode.rule.value;
			const spaceNeededBullets = textNode.rule.options.spaceNeededBullets || [];

			if (isMayListItem(text, bullets, spaceNeededBullets)) {
				report({
					scope: textNode,
					message: t('Use {0}', t('the {0}', t('{0*} element', 'li'))),
				});
			}
		});
	},
});

function isMayListItem(text: string, bullets: Bullets, spaceNeededBullets: string[]) {
	const textArray = Array.from(text);
	const firstLetter = textArray[0] ?? '';
	const isBullet = bullets.includes(firstLetter);
	const needSpace = spaceNeededBullets.includes(firstLetter);

	const continuous = firstLetter === textArray[1];
	if (continuous) {
		return false;
	}

	if (isBullet && needSpace && text[1]) {
		const secondLetter = text[1];
		const isSpace = /^\s$/.test(secondLetter);
		return isSpace;
	}

	return isBullet;
}
