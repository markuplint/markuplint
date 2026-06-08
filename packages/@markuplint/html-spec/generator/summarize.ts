/**
 * @module @markuplint/html-spec/generator/summarize
 *
 * Produces a human-readable Markdown summary of what changed between the
 * previously committed spec and the freshly generated one. The auto-update
 * workflow puts this in the PR body so reviewers can see which elements, ARIA
 * roles/properties, and attributes changed without diffing the 10,000+ line
 * `index.json`.
 *
 * @see https://github.com/markuplint/markuplint/issues/3894
 * @see https://github.com/markuplint/markuplint/issues/3897
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

const ARIA_VERSIONS = ['1.1', '1.2', '1.3'] as const;

/**
 * Computes the sorted names that were added to and removed from `next`
 * relative to `prev`.
 */
function diffNames(prev: readonly string[], next: readonly string[]): { added: string[]; removed: string[] } {
	const prevSet = new Set(prev);
	const nextSet = new Set(next);
	const added = next.filter(name => !prevSet.has(name)).toSorted();
	const removed = prev.filter(name => !nextSet.has(name)).toSorted();
	return { added, removed };
}

/**
 * Renders an added/removed name list as Markdown bullet lines, or `null` when
 * there is nothing to show.
 */
function renderNameDiff(label: string, prev: readonly string[], next: readonly string[]): string | null {
	const { added, removed } = diffNames(prev, next);
	if (added.length === 0 && removed.length === 0) {
		return null;
	}
	const lines = [`### ${label}`, ''];
	if (added.length > 0) {
		lines.push(`- **Added (${added.length})**: ${added.map(n => `\`${n}\``).join(', ')}`);
	}
	if (removed.length > 0) {
		lines.push(`- **Removed (${removed.length})**: ${removed.map(n => `\`${n}\``).join(', ')}`);
	}
	return lines.join('\n');
}

/**
 * Extracts the `name` of each definition, tolerating both the plain-string and
 * the `{ name }` object forms used across the ARIA arrays.
 */
function names(defs: readonly (string | { readonly name: string })[] | undefined): string[] {
	return (defs ?? []).map(d => (typeof d === 'string' ? d : d.name));
}

/**
 * Formats a count delta like `120 → 123 (+3)`, or `120 (unchanged)`.
 */
function countDelta(prev: number, next: number): string {
	if (prev === next) {
		return `${next} (unchanged)`;
	}
	const sign = next > prev ? '+' : '';
	return `${prev} → ${next} (${sign}${next - prev})`;
}

/**
 * Builds a Markdown summary of the changes from `previous` to `next`.
 *
 * On first generation (`previous` is null/undefined), returns a short
 * initial-generation note instead of a diff.
 *
 * @param previous - The previously committed spec, if any.
 * @param next - The freshly generated spec.
 * @returns A Markdown string suitable for a PR body.
 */
export function summarizeChanges(previous: ExtendedSpec | null | undefined, next: ExtendedSpec): string {
	if (!previous) {
		const elementCount = next.specs?.length ?? 0;
		return `Initial generation: ${elementCount} elements, ${next.cites?.length ?? 0} reference URLs.`;
	}

	const sections: string[] = [];

	// Elements.
	const prevElements = (previous.specs ?? []).map(s => s.name);
	const nextElements = (next.specs ?? []).map(s => s.name);
	sections.push(`**Elements**: ${countDelta(prevElements.length, nextElements.length)}`);
	const elementDiff = renderNameDiff('Element changes', prevElements, nextElements);
	if (elementDiff) {
		sections.push(elementDiff);
	}

	// ARIA roles (incl. graphics & dpub) and properties per version.
	const ARIA_CATEGORIES = [
		{ key: 'roles', label: 'roles' },
		{ key: 'graphicsRoles', label: 'graphics roles' },
		{ key: 'dpubRoles', label: 'dpub roles' },
		{ key: 'props', label: 'props' },
	] as const;
	const ariaLines: string[] = [];
	for (const version of ARIA_VERSIONS) {
		const prevAria = previous.def?.['#aria']?.[version];
		const nextAria = next.def?.['#aria']?.[version];
		if (!prevAria || !nextAria) {
			continue;
		}
		const parts: string[] = [];
		const detailLines: string[] = [];
		for (const { key, label } of ARIA_CATEGORIES) {
			const { added, removed } = diffNames(names(prevAria[key]), names(nextAria[key]));
			if (added.length === 0 && removed.length === 0) {
				continue;
			}
			if (added.length > 0) {
				parts.push(`+${added.length} ${label}`);
				detailLines.push(`  - ${label} added: ${added.map(n => `\`${n}\``).join(', ')}`);
			}
			if (removed.length > 0) {
				parts.push(`-${removed.length} ${label}`);
				detailLines.push(`  - ${label} removed: ${removed.map(n => `\`${n}\``).join(', ')}`);
			}
		}
		if (parts.length === 0) {
			continue;
		}
		ariaLines.push([`- **ARIA ${version}**: ${parts.join(', ')}`, ...detailLines].join('\n'));
	}
	if (ariaLines.length > 0) {
		sections.push(['### ARIA changes', '', ...ariaLines].join('\n'));
	}

	// Reference URLs.
	const prevCites = previous.cites?.length ?? 0;
	const nextCites = next.cites?.length ?? 0;
	if (prevCites !== nextCites) {
		sections.push(`**Reference URLs**: ${countDelta(prevCites, nextCites)}`);
	}

	if (sections.length === 1 && !elementDiff) {
		// Only the unchanged element-count line — nothing structural changed.
		return 'No structural changes to elements, ARIA roles/properties, or reference URLs. (Attribute-level or description-only changes may still be present — review the diff.)';
	}

	return sections.join('\n\n');
}
