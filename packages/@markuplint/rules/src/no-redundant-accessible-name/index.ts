import type { PlainData } from '@markuplint/ml-config';
import type { Element, RuleConfigValue, Document } from '@markuplint/ml-core';
import type { ComputedRole } from '@markuplint/ml-spec';

import { createRule, getComputedRole } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, isExposed } from '@markuplint/ml-spec';

import { accnameMayBeMutable, getOwnedLabel } from '../helpers.js';

import meta from './meta.js';

type NamingSource = {
	readonly label: string;
};

export default createRule({
	meta,
	defaultSeverity: 'warning',
	defaultOptions: {
		checkTitleFallback: false,
		checkPlaceholderFallback: false,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const ariaVersion = ARIA_RECOMMENDED_VERSION;

			// Skip mutable elements (template expressions etc.)
			if (accnameMayBeMutable(el, document)) {
				return;
			}

			// Skip hidden elements
			if (!isExposed(el, document.specs, ariaVersion)) {
				return;
			}

			// Skip nameFrom: "prohibited" roles (generic, none, presentation)
			const computed = getComputedRole(document.specs, el, ariaVersion);
			if (computed.role?.accessibleNameProhibited) {
				return;
			}

			const sources = collectNamingSources(el, document, el.rule.options, computed);

			if (sources.length >= 2) {
				const winner = sources[0]!;
				const overridden = sources.slice(1);
				for (const loser of overridden) {
					report({
						scope: el,
						message: t('The accessible name from "{0*}" overrides "{1*}"', winner.label, loser.label),
					});
				}
			}
		});
	},
});

function collectNamingSources<V extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<V, O>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: Document<V, O>,
	options: {
		readonly checkTitleFallback: boolean;
		readonly checkPlaceholderFallback: boolean;
	},
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	computed: ComputedRole,
): readonly NamingSource[] {
	const sources: NamingSource[] = [];

	// 1. aria-labelledby
	const ariaLabelledby = el.getAttribute('aria-labelledby');
	if (ariaLabelledby && ariaLabelledby.trim()) {
		const ids = ariaLabelledby.trim().split(/\s+/);
		const hasResolvableId = ids.some(id => document.querySelector(`[id="${id}"]`));
		if (hasResolvableId) {
			sources.push({ label: 'aria-labelledby' });
		}
	}

	// 2. aria-label
	const ariaLabel = el.getAttribute('aria-label');
	if (ariaLabel && ariaLabel.trim()) {
		sources.push({ label: 'aria-label' });
	}

	// 3. label (explicit or implicit) — only for labelable elements
	const ownedLabel = getOwnedLabel(el, document);
	if (ownedLabel) {
		sources.push({ label: 'label' });
	}

	// 4. alt — img, area, input[type=image]
	if (el.matches('img, area, input[type=image]')) {
		const alt = el.getAttribute('alt');
		if (alt != null && alt.trim()) {
			sources.push({ label: 'alt' });
		}
	}

	// 5. content — role allows nameFromContent
	if (computed.role?.accessibleNameFromContent) {
		const text = el.textContent.trim();
		if (text) {
			sources.push({ label: 'content' });
		}
	}

	// 6. value — input[type=button/submit/reset]
	if (el.matches('input[type=button], input[type=submit], input[type=reset]')) {
		const value = el.getAttribute('value');
		if (value != null && value.trim()) {
			sources.push({ label: 'value' });
		}
	}

	// 7. legend — fieldset (direct child only)
	if (el.matches('fieldset')) {
		const legend = el.querySelector(':scope > legend');
		if (legend && legend.textContent.trim()) {
			sources.push({ label: 'legend' });
		}
	}

	// 8. caption — table (direct child only)
	if (el.matches('table')) {
		const caption = el.querySelector(':scope > caption');
		if (caption && caption.textContent.trim()) {
			sources.push({ label: 'caption' });
		}
	}

	// 9. title (optional)
	if (options.checkTitleFallback) {
		const title = el.getAttribute('title');
		if (title != null && title.trim()) {
			sources.push({ label: 'title' });
		}
	}

	// 10. placeholder (optional)
	if (options.checkPlaceholderFallback) {
		const placeholder = el.getAttribute('placeholder');
		if (placeholder != null && placeholder.trim()) {
			sources.push({ label: 'placeholder' });
		}
	}

	return sources;
}
