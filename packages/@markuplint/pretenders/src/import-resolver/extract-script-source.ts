/**
 * @module extract-script-source
 *
 * Script source extractors for component files.
 *
 * Vue `<script setup>`, Svelte `<script>`, and Astro frontmatter extraction
 * has been moved to each parser's `component-scanner` subpath export.
 * This module retains only:
 *
 * | Function                         | Purpose                                              |
 * |----------------------------------|------------------------------------------------------|
 * | `extractVueScript`               | Vue Options API `<script>` block (non-setup)         |
 * | `extractVueOptionsApiComponents` | Vue `components: { ... }` registration extraction    |
 * | `extractMdxEsm`                  | MDX top-level ESM (no parser package for MDX)        |
 */

export interface ScriptSourceBlock {
	readonly content: string;
	/** The offset (in characters) of the content start within the original source */
	readonly offset: number;
}

/**
 * Matches only a regular `<script>` block, never `<script setup>`.
 */
export function extractVueScript(source: string): ScriptSourceBlock | null {
	const re = /<script(?:\s[^>]*)?>/gi;
	let match: RegExpExecArray | null;

	while ((match = re.exec(source)) !== null) {
		const startTag = match[0];

		// Skip <script setup> blocks
		if (/\bsetup\b/i.test(startTag)) {
			continue;
		}

		const contentStart = match.index + startTag.length;
		const remaining = source.slice(contentStart);
		const endMatch = /<\/script\s*>/i.exec(remaining);
		if (!endMatch) {
			continue;
		}

		return {
			content: remaining.slice(0, endMatch.index),
			offset: contentStart,
		};
	}

	return null;
}

/**
 * For aliased forms (`{ Btn: MyButton }`), returns the value (the import name),
 * not the key (the template name).
 */
export function extractVueOptionsApiComponents(scriptContent: string): string[] {
	if (!scriptContent) {
		return [];
	}

	// Match `components: { ... }` allowing for multiline
	const re = /\bcomponents\s*:\s*\{([^}]*)\}/;
	const match = re.exec(scriptContent);
	if (!match?.[1]) {
		return [];
	}

	const names: string[] = [];
	for (const entry of match[1].split(',')) {
		const trimmed = entry.trim();
		if (!trimmed) {
			continue;
		}

		// Split on first colon only to handle values containing colons
		const colonIdx = trimmed.indexOf(':');
		if (colonIdx === -1) {
			// Shorthand: `Button` → use as-is
			names.push(trimmed);
		} else {
			// Aliased form: `Btn: MyButton` → use value `MyButton`
			const value = trimmed.slice(colonIdx + 1).trim();
			if (value) {
				names.push(value);
			}
		}
	}

	return names;
}

/**
 * Known limitation: the closing line of a multi-line block (e.g., `} from '...'`)
 * is not recognized as ESM, so standalone multi-line imports are not captured.
 * Single-line imports preceding a multi-line block are still returned correctly.
 */
export function extractMdxEsm(source: string): ScriptSourceBlock | null {
	const lines = source.split('\n');
	let esmEnd = 0;
	let pos = 0;
	let braceDepth = 0;

	for (const line of lines) {
		const trimmed = line.trim();

		// Track brace depth for multi-line imports
		for (const ch of line) {
			if (ch === '{') {
				braceDepth++;
			}
			if (ch === '}') {
				braceDepth--;
			}
		}

		pos += line.length + 1; // +1 for '\n'

		// Inside a multi-line import/export block
		if (braceDepth > 0) {
			continue;
		}

		// ESM-like lines: import, export, empty, single-line comments
		if (trimmed === '' || /^import\s/.test(trimmed) || /^export\s/.test(trimmed) || trimmed.startsWith('//')) {
			esmEnd = pos;
			continue;
		}

		// Non-ESM content (markdown, JSX, etc.) — stop
		break;
	}

	if (esmEnd === 0) {
		return null;
	}

	const content = source.slice(0, esmEnd);

	// Verify the extracted block actually contains import/export statements
	if (!/\b(?:import|export)\s/.test(content)) {
		return null;
	}

	return {
		content,
		offset: 0,
	};
}
