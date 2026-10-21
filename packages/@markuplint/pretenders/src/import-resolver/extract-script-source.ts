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

import ts from 'typescript';

export interface ScriptSourceBlock {
	readonly content: string;
	/** The offset (in characters) of the content start within the original source */
	readonly offset: number;
	/** The `lang` attribute of the start tag as written, when it has one */
	readonly lang?: string;
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

		const lang = langOf(startTag);

		return {
			content: remaining.slice(0, endMatch.index),
			offset: contentStart,
			...(lang ? { lang } : {}),
		};
	}

	return null;
}

/**
 * The value of the `lang` attribute of a start tag. The attributes are read one by one, so that
 * ` lang='tsx'` inside the quoted value of another attribute is not one. (`@markuplint/vue-parser`
 * reads the `<script setup>` block the same way; this package reads the other one.)
 */
function langOf(startTag: string): string | undefined {
	for (const [, name, double, single, bare] of startTag.matchAll(
		/\s([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
	)) {
		if (name?.toLowerCase() === 'lang') {
			return double ?? single ?? bare;
		}
	}
	return undefined;
}

/**
 * The names of the bindings that `components: { ... }` registers, which the imports of the script are
 * filtered by: the `name` of each of {@link extractVueOptionsApiRegistrations}.
 *
 * For aliased forms (`{ Btn: MyButton }`), returns the value (the import name),
 * not the key (the template name). For a value that is not an identifier but
 * holds a dynamic `import()` (`{ Item: defineAsyncComponent(() => import('./Item.vue')) }`)
 * it returns the key, the name the lazily loaded component is bound under. Any other
 * value gives no name.
 *
 * @param scriptContent - The source of the script block
 * @returns The names of the bindings
 */
export function extractVueOptionsApiComponents(scriptContent: string): string[] {
	return extractVueOptionsApiRegistrations(scriptContent).map(({ name }) => name);
}

/**
 * A component of `components: { ... }`: the `key` the template names it by, and the `name` of
 * the binding that holds it, which an import gives (`Btn: MyButton` is the key `Btn` and the name
 * `MyButton`; `'foo-bar': Foo`, the key `foo-bar` and the name `Foo`). They are one for a shorthand
 * (`Button`) and for a value that loads a module (`Item: defineAsyncComponent(() => import(...))`).
 */
export type VueComponentRegistration = {
	readonly key: string;
	readonly name: string;
};

/**
 * The components that `components: { ... }` registers, each with the key the template names it
 * by (see {@link VueComponentRegistration}): Vue resolves a tag to a registration by that key, and
 * by none of the names that an import gives.
 *
 * A value that is neither an identifier nor holds a dynamic `import()` gives no name, so its key
 * is left out.
 *
 * @param scriptContent - The source of the script block
 * @param scriptKind - How to read it; JSX before the registration breaks the tree of `ts.ScriptKind.TS`
 */
export function extractVueOptionsApiRegistrations(
	scriptContent: string,
	scriptKind: ts.ScriptKind = ts.ScriptKind.TS,
): VueComponentRegistration[] {
	if (!scriptContent) {
		return [];
	}

	const sourceFile = ts.createSourceFile('script', scriptContent, ts.ScriptTarget.Latest, true, scriptKind);
	const registry = findComponentsObject(sourceFile);
	if (!registry) {
		return [];
	}

	const registrations: VueComponentRegistration[] = [];
	for (const property of registry.properties) {
		if (ts.isShorthandPropertyAssignment(property)) {
			// Shorthand: `Button` → use as-is
			registrations.push({ key: property.name.text, name: property.name.text });
		} else if (ts.isPropertyAssignment(property)) {
			const key = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : null;
			const value = property.initializer;
			if (ts.isIdentifier(value)) {
				// Aliased form: `Btn: MyButton` → the binding is `MyButton`, registered as `Btn`
				registrations.push({ key: key ?? value.text, name: value.text });
			} else if (key && containsDynamicImport(value)) {
				// A value that loads a module (`Item: defineAsyncComponent(() => import('./Item.vue'))`)
				// is bound under the key, as `dynamicImportNames` names that import.
				registrations.push({ key, name: key });
			}
		}
	}

	return registrations;
}

function containsDynamicImport(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): boolean {
	return (
		(ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) ||
		(ts.forEachChild(node, child => containsDynamicImport(child) || undefined) ?? false)
	);
}

/** The object literal of the first `components: { ... }` in source order. */
function findComponentsObject(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): ts.ObjectLiteralExpression | null {
	if (
		ts.isPropertyAssignment(node) &&
		(ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
		node.name.text === 'components' &&
		ts.isObjectLiteralExpression(node.initializer)
	) {
		return node.initializer;
	}
	return ts.forEachChild(node, findComponentsObject) ?? null;
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
