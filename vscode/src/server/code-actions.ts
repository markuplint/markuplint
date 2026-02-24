import type { FixState } from './v4.js';
import type { TextEdit as MLTextEdit } from '@markuplint/ml-config';
import type { CodeAction, Diagnostic, Position, Range } from 'vscode-languageserver';

import { CodeActionKind } from 'vscode-languageserver';
import { getPosition } from '@markuplint/shared';

/**
 * Code Action kind for "Fix all markuplint issues".
 * Follows the `source.fixAll.<provider>` convention used by ESLint and others.
 */
export const SOURCE_FIX_ALL_MARKUPLINT = `${CodeActionKind.SourceFixAll}.markuplint`;

/**
 * Converts a 0-based character offset to an LSP Position using the source code.
 *
 * @param sourceCode - The full raw source text
 * @param offset - A zero-based character offset into the source
 * @returns A 0-based LSP Position (line and character)
 */
export function offsetToPosition(sourceCode: string, offset: number): Position {
	const pos = getPosition(sourceCode, offset);
	return { line: pos.line - 1, character: pos.column - 1 };
}

/**
 * Converts a markuplint TextEdit (offset-based) to an LSP Range.
 */
function toRange(sourceCode: string, edit: MLTextEdit): Range {
	return {
		start: offsetToPosition(sourceCode, edit.range[0]),
		end: offsetToPosition(sourceCode, edit.range[1]),
	};
}

/**
 * Creates per-violation QuickFix Code Actions.
 *
 * @param uri - The document URI to associate edits with
 * @param diagnostics - The diagnostics from the Code Action request context
 * @param fixState - The latest lint result containing violations and fix data
 * @returns An array of QuickFix Code Actions, one per fixable violation
 */
export function createQuickFixActions(
	uri: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	diagnostics: readonly Diagnostic[],
	fixState: FixState,
): CodeAction[] {
	const actions: CodeAction[] = [];
	for (const diagnostic of diagnostics) {
		const index = (diagnostic.data as { violationIndex?: number } | undefined)?.violationIndex;
		if (index == null) continue;
		const violation = fixState.violations[index];
		if (!violation?.fix) continue;

		const edits = violation.fix.edits.map(edit => ({
			range: toRange(fixState.sourceCode, edit),
			newText: edit.text,
		}));

		actions.push({
			title: `Fix: ${diagnostic.message}`,
			kind: CodeActionKind.QuickFix,
			diagnostics: [diagnostic],
			isPreferred: true,
			edit: { changes: { [uri]: edits } },
		});
	}
	return actions;
}

/**
 * Creates a SourceFixAll Code Action (`source.fixAll.markuplint`).
 *
 * Uses firstPassEdits from FixSummary for cursor-safe individual edits.
 * Falls back to full-document replacement when firstPassEdits is unavailable.
 *
 * @param uri - The document URI to associate edits with
 * @param diagnostics - The diagnostics to attach to the Code Action
 * @param fixState - The latest lint result containing violations and fix data
 * @returns A SourceFixAll Code Action, or `null` if nothing to fix
 */
export function createFixAllAction(
	uri: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	diagnostics: readonly Diagnostic[],
	fixState: FixState,
): CodeAction | null {
	if (fixState.fixedCode === fixState.sourceCode) return null;

	let textEdits: { range: Range; newText: string }[];

	if (fixState.fixSummary?.firstPassEdits && fixState.fixSummary.firstPassEdits.length > 0) {
		textEdits = fixState.fixSummary.firstPassEdits.map(edit => ({
			range: toRange(fixState.sourceCode, edit),
			newText: edit.text,
		}));
	} else {
		const lines = fixState.sourceCode.split('\n');
		textEdits = [
			{
				range: {
					start: { line: 0, character: 0 },
					end: { line: lines.length - 1, character: lines.at(-1)!.length },
				},
				newText: fixState.fixedCode,
			},
		];
	}

	return {
		title: 'Fix all markuplint issues',
		kind: SOURCE_FIX_ALL_MARKUPLINT,
		diagnostics: [...diagnostics],
		edit: { changes: { [uri]: textEdits } },
	};
}
