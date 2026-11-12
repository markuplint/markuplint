/**
 * @module @markuplint/test-tools/translator-templates
 *
 * Reads the messages that a source file passes to the translator. It is a subpath export, not part
 * of the package entry point: it loads the TypeScript compiler, which the specs that only need
 * `createJSDOMElement` should not pay for.
 */
import ts from 'typescript';

/** What a source file knows by name: a constant and the strings it can be. */
export type StringConstants = ReadonlyMap<string, readonly string[]>;

/**
 * A message template that a source file passes to the translator `t()` of `@markuplint/i18n`.
 */
export interface TranslatorTemplate {
	/** The template as written, with the no-translate marks (`{0*}`) still in place. */
	readonly template: string;
	/** 1-based line of the call. */
	readonly line: number;
	/**
	 * The values given for the placeholders, in order. Each is every string the expression can be
	 * (a literal, the branches of a conditional); empty when it is only known at run time.
	 */
	readonly args: readonly (readonly string[])[];
	/** The source text of each of those arguments. */
	readonly argTexts: readonly string[];
}

/**
 * Reads the top-level constants of a source file that are strings, so that a call such as
 * `t(NO_INSTALL_WARNING, version)` can be read with the template the constant holds.
 *
 * @param source - The text of a TypeScript file
 * @returns The strings each constant can be, by its name
 */
export function extractStringConstants(source: string): StringConstants {
	return collectConstants(parse(source), new Map(), false);
}

/**
 * Collects the `const` declarations whose value is a string known without running the code, in
 * source order, so that a later one can be built from an earlier one. With `nested`, a declaration
 * inside a function counts too, and one name declared twice holds the strings of both: the rules
 * declare `const ms = severity === 'error' ? 'must' : 'should'` in each of their callbacks.
 */
function collectConstants(file: ts.SourceFile, known: StringConstants, nested: boolean): StringConstants {
	const constants = new Map(known);
	const declared = new Set<string>();
	const visit = (node: ts.Node) => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			ts.isVariableDeclarationList(node.parent) &&
			node.parent.flags & ts.NodeFlags.Const &&
			(nested || ts.isSourceFile(node.parent.parent.parent))
		) {
			const values = expand(node.initializer, constants);
			if (values.length > 0) {
				const same = declared.has(node.name.text) ? (constants.get(node.name.text) ?? []) : [];
				declared.add(node.name.text);
				constants.set(node.name.text, [...new Set([...same, ...values])]);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(file);
	return constants;
}

/**
 * Reads the templates that a source file passes to `t()`, so that a spec can check them against
 * a locale file: a template that a locale has no sentence for is shown in English, with the
 * keywords inside it translated, as a message in two languages.
 *
 * Only the first argument of a call to the bare identifier `t` is read, and only the forms whose
 * value is known without running the code:
 *
 * - a string literal, or a template literal without a substitution
 * - a conditional (`a ? 'x' : 'y'`): every branch
 * - a constant of the file (also one declared inside a function), or one of `constants` (what
 *   `extractStringConstants` read in another file)
 * - a template literal whose only substitutions are such constants, in every combination. The rules
 *   build `{0} ${ms} be {1}` from `const ms = severity === 'error' ? 'must' : 'should'`
 *
 * Anything else (a list, a template literal with another substitution such as `${count}`) carries
 * no template and is skipped. A method named `t` is not the translator.
 *
 * @param source - The text of a TypeScript file
 * @param constants - Constants of other files that the source imports
 * @returns The templates, in source order
 */
export function extractTranslatorTemplates(
	source: string,
	constants: StringConstants = new Map(),
): readonly TranslatorTemplate[] {
	const file = parse(source);
	const known = collectConstants(file, constants, true);
	const found: TranslatorTemplate[] = [];

	const visit = (node: ts.Node) => {
		if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
			const first = node.arguments[0];
			if (first) {
				const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
				const rest = node.arguments.slice(1);
				const args = rest.map(arg => expand(arg, known));
				const argTexts = rest.map(arg => arg.getText(file));
				for (const template of expand(first, known)) {
					found.push({ template, line, args, argTexts });
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(file);

	return found;
}

/** The parts of a locale file that the translator looks messages up in. */
export interface TranslatorLocale {
	readonly sentences?: Readonly<Record<string, string>>;
	readonly keywords?: Readonly<Record<string, string>>;
}

/**
 * The last part of a property or variable that holds the name of an element, an attribute or a
 * role (`el.localName`, `attr.name`, `spec.name`): not a word of the language, so it is shown as
 * written.
 */
const NAME_LIKE = /(?:^|\.)(?:localName|rawName|nodeName|attrName|elName|name)$/;

/**
 * Finds what the translator would leave in English with the given locale, in the calls to `t()`
 * of a source file:
 *
 * - a template that has no sentence (a text without a placeholder may be a keyword instead).
 *   The key is compared as the translator does: the no-translate marks (`{0*}`) removed, lower
 *   case
 * - a string given for a placeholder without `*` that is not a keyword. The translator looks the
 *   value up as a keyword, so a value that is a word must be a keyword. A `c:`-prefixed keyword
 *   counts for a `{n:c}` placeholder, and `%…%` marks a value that is not to be translated
 * - a name given for a placeholder without `*`: an argument written like a name (`el.localName`,
 *   `attr.name`) is data, and a name that is also a keyword (`list`, `name`) would be translated
 *
 * What it cannot see: a value that is known only at run time and is not written like a name (a
 * variable, a call) may still be an untranslated word or a name. The specs of the rules that show
 * one run with `locale: 'ja'` for that.
 *
 * @param source - The text of a TypeScript file
 * @param locale - The sentences and keywords of the locale file
 * @param constants - Constants of other files that the source imports
 * @returns One line per finding: the line of the call, the template, and what is missing
 */
export function findUntranslatedMessages(
	source: string,
	locale: Readonly<TranslatorLocale>,
	constants: StringConstants = new Map(),
): readonly string[] {
	const sentences = new Set(Object.keys(locale.sentences ?? {}).map(key => key.toLowerCase()));
	const keywords = new Set(Object.keys(locale.keywords ?? {}).map(key => key.toLowerCase()));
	const findings: string[] = [];

	for (const { template, line, args, argTexts } of extractTranslatorTemplates(source, constants)) {
		const key = template.replaceAll(/(?<=\{\d+)\*(?=\})/g, '').toLowerCase();
		const hasPlaceholder = /\{\d+/.test(key);
		if (!sentences.has(key) && (hasPlaceholder || !keywords.has(key))) {
			findings.push(`${line}: ${template}`);
		}

		// The flags of every use of an index: a value is translated when one of its uses has no `*`
		const flags = new Map<string, Set<string>>();
		for (const [, index = '', flag = ''] of template.matchAll(/\{(\d+)(\*|:c)?\}/g)) {
			flags.set(index, (flags.get(index) ?? new Set<string>()).add(flag));
		}
		for (const [index, values] of args.entries()) {
			const uses = flags.get(`${index}`);
			if (!uses || ![...uses].some(flag => flag !== '*')) {
				continue;
			}
			if (values.length === 0) {
				if (NAME_LIKE.test(argTexts[index] ?? '')) {
					findings.push(
						`${line}: ${template} — {${index}} ${argTexts[index]} is a name: write it as {${index}*}`,
					);
				}
				continue;
			}
			for (const value of values) {
				if (value.trim() === '' || /^%[^%]+%$/.test(value)) {
					continue;
				}
				const word = value.toLowerCase();
				if (!keywords.has(word) && !(uses.has(':c') && keywords.has(`c:${word}`))) {
					findings.push(`${line}: ${template} — {${index}} "${value}" is not a keyword`);
				}
			}
		}
	}

	return findings;
}

function parse(source: string) {
	return ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function expand(node: ts.Expression, constants: StringConstants): readonly string[] {
	if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
		return expand(node.expression, constants);
	}
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		return [node.text];
	}
	if (ts.isIdentifier(node)) {
		return constants.get(node.text) ?? [];
	}
	if (ts.isConditionalExpression(node)) {
		return [...expand(node.whenTrue, constants), ...expand(node.whenFalse, constants)];
	}
	if (ts.isTemplateExpression(node)) {
		let results: readonly string[] = [node.head.text];
		for (const span of node.templateSpans) {
			const values = ts.isIdentifier(span.expression) ? (constants.get(span.expression.text) ?? []) : [];
			if (values.length === 0) {
				return [];
			}
			results = results.flatMap(prefix => values.map(value => prefix + value + span.literal.text));
		}
		return results;
	}
	return [];
}
