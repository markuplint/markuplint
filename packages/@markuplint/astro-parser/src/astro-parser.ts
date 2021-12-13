import type { Attribute, Style, TemplateNode } from '@astrojs/parser';

import { CompileError as AstroCompileError, parse } from '@astrojs/parser';

export { CompileError as AstroCompileError } from '@astrojs/parser';
export type ASTNode = TemplateNode;
export type ASTStyleNode = Style;
export type ASTAttribute = Attribute;
export type AstroAST = {
	html?: ASTNode;
	style?: ASTStyleNode[];
};

export function astroParse(code: string): AstroAST | AstroCompileError {
	try {
		const ast = parse(code, {});
		return {
			html: ast.html,
			style: ast.css,
		};
	} catch (e) {
		if (e instanceof AstroCompileError) {
			return e;
		}
		throw e;
	}
}
