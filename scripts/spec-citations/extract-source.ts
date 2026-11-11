import type { Section } from './types.ts';

import ts from 'typescript';

/**
 * The host that a source file of a framework is fetched from. A citation of such a file is written as the
 * `github.com/<owner>/<repo>/blob/<ref>/<path>#<name>` URL that a reader opens, and `parseSpecUrl` turns it into this
 * one for fetching, because `github.com` answers with a page around the file, not the file.
 */
export const RAW_SOURCE_HOST = 'raw.githubusercontent.com';

/**
 * Whether a cited page is a raw source file of a framework (the file is compared by a declaration), not a page of
 * a specification or of documentation. "Source" here is the code of a framework: it is neither the `source` kind of
 * a file that `discover.ts` reads, nor the unrendered ReSpec source of `unprocessed-source`.
 */
export function isSourcePage(page: string): boolean {
	return page.startsWith(`https://${RAW_SOURCE_HOST}/`);
}

/** The names that a binding introduces, down through a destructuring pattern. */
function boundNames(name: ts.BindingName): string[] {
	if (ts.isIdentifier(name)) {
		return [name.text];
	}
	return name.elements.flatMap(element => (ts.isOmittedExpression(element) ? [] : boundNames(element.name)));
}

/** `exports.name = …` and `module.exports.name = …`: how a CommonJS file (Pug's runtime) declares what it exports. */
function exportedName(statement: ts.Statement): string | null {
	if (!ts.isExpressionStatement(statement) || !ts.isBinaryExpression(statement.expression)) {
		return null;
	}
	const { left, operatorToken } = statement.expression;
	if (operatorToken.kind !== ts.SyntaxKind.EqualsToken || !ts.isPropertyAccessExpression(left)) {
		return null;
	}
	const owner = left.expression.getText();
	return owner === 'exports' || owner === 'module.exports' ? left.name.text : null;
}

/** Names of the top-level declarations a statement introduces. */
function declaredNames(statement: ts.Statement): string[] {
	if (ts.isVariableStatement(statement)) {
		return statement.declarationList.declarations.flatMap(d => boundNames(d.name));
	}
	const exported = exportedName(statement);
	if (exported !== null) {
		return [exported];
	}
	if (
		ts.isFunctionDeclaration(statement) ||
		ts.isClassDeclaration(statement) ||
		ts.isEnumDeclaration(statement) ||
		ts.isTypeAliasDeclaration(statement) ||
		ts.isInterfaceDeclaration(statement)
	) {
		return statement.name === undefined ? [] : [statement.name.text];
	}
	return [];
}

/**
 * Extracts the top-level declaration that a citation of a framework source names by its fragment (`#addAttribute`).
 *
 * A source file cannot be compared by its sections, and hashing the whole file would report every edit of a file
 * that holds far more than the cited rule (`util.ts` of Astro has dozens of functions). The unit is the declaration:
 * its text, without the comment above it (a comment changes more often than the code the table was read from),
 * with the line endings and the trailing whitespace normalized so that neither moves the hash. A comment inside
 * the declaration is part of it, so a `>` quote can be taken from one, but not from the comment above. A renamed or
 * removed declaration is `missing`, which is how a refactor of the framework reaches a maintainer.
 *
 * Every statement that declares the name is the unit, in file order: the overload signatures of a function are
 * statements of their own, and the implementation, which the table was read from, is the last of them.
 * A declaration is a function, a variable (a destructuring binds several names), a class, an enum, a type or an
 * interface, or the `exports.name = …` of a CommonJS file.
 *
 * Every file is read as TypeScript, `.js` ones included: React's sources carry Flow annotations, which the
 * TypeScript parser recovers from well enough to keep the top-level declarations apart.
 */
export function extractDeclaration(text: string, name: string): Section {
	const source = ts.createSourceFile('source.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const units = source.statements
		.filter(statement => declaredNames(statement).includes(name))
		.map(statement =>
			text
				.slice(statement.getStart(source), statement.end)
				.split(/\r?\n/)
				.map(line => line.trimEnd())
				.join('\n'),
		);
	if (units.length === 0) {
		return { status: 'missing' };
	}
	const unit = units.join('\n');
	return { status: 'found', unit, scope: unit, secno: null };
}
