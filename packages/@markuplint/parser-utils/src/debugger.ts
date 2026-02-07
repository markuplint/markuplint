import type { MLASTAttr, MLASTNode, MLASTToken } from '@markuplint/ml-ast';

/**
 * Converts a list of AST nodes into human-readable debug strings showing
 * each node's position, type, and raw content. Useful for snapshot testing.
 *
 * @param nodeList - The flat list of AST nodes to convert
 * @param withAttr - Whether to include detailed attribute debug info for start tags
 * @returns An array of formatted debug strings, one per node (plus attribute lines when enabled)
 */
export function nodeListToDebugMaps(nodeList: readonly (MLASTNode | null)[], withAttr = false) {
	return nodeList.flatMap(n => {
		const r: string[] = [];
		r.push(tokenDebug(n));
		if (withAttr && n && n.type === 'starttag') {
			r.push(...attributesToDebugMaps(n.attributes).flat());
		}
		return r;
	});
}

/**
 * Converts a list of AST attributes into detailed debug strings showing
 * each attribute's components (name, equal sign, value, quotes) with
 * their positions and additional metadata like directives and dynamic values.
 *
 * @param attributes - The list of attributes to convert into debug representations
 * @returns An array of string arrays, one inner array per attribute containing its debug lines
 */
export function attributesToDebugMaps(attributes: readonly MLASTAttr[]) {
	return attributes.map(n => {
		const r = [
			tokenDebug({
				...n,
				name: n.type === 'attr' ? n.name.raw : n.raw,
			}),
		];
		if (n.type === 'spread') {
			r.push(`  #spread: ${visibleWhiteSpace(n.raw)}`);
			return r;
		}
		r.push(
			`  ${tokenDebug(n.spacesBeforeName, 'bN')}`,
			`  ${tokenDebug(n.name, 'name')}`,
			`  ${tokenDebug(n.spacesBeforeEqual, 'bE')}`,
			`  ${tokenDebug(n.equal, 'equal')}`,
			`  ${tokenDebug(n.spacesAfterEqual, 'aE')}`,
			`  ${tokenDebug(n.startQuote, 'sQ')}`,
			`  ${tokenDebug(n.value, 'value')}`,
			`  ${tokenDebug(n.endQuote, 'eQ')}`,
			`  isDirective: ${!!n.isDirective}`,
			`  isDynamicValue: ${!!n.isDynamicValue}`,
		);
		if (n.potentialName != null) {
			r.push(`  potentialName: ${visibleWhiteSpace(n.potentialName)}`);
		}
		if (n.potentialValue != null) {
			r.push(`  potentialValue: ${visibleWhiteSpace(n.potentialValue)}`);
		}
		if (n.valueType != null) {
			r.push(`  valueType: ${visibleWhiteSpace(n.valueType)}`);
		}
		if (n.candidate) {
			r.push(`  candidate: ${visibleWhiteSpace(n.candidate)}`);
		}
		return r;
	});
}

/**
 * Produces a tree-style debug view of AST nodes, showing indentation
 * based on depth, parent-child relationships, pair node links,
 * and ghost/bogus markers. Useful for visualizing the parsed DOM structure.
 *
 * @param nodeTree - The flat list of AST nodes to visualize as a tree
 * @param idFilter - Whether to replace UUIDs with short sequential hex IDs for readability
 * @returns An array of formatted strings representing the tree view
 */
export function nodeTreeDebugView(nodeTree: readonly MLASTNode[], idFilter = false) {
	const filter = idFilter ? uuidFilter : (id: string) => id;
	return nodeTree
		.map((n, i) => {
			const lines: string[] = [];
			if (n.type === 'attr' || n.type === 'spread') {
				return;
			}
			lines.push(
				`${i.toString().padStart(3, '0')}: [${filter(n.uuid)}] ${'  '.repeat(Math.max(n.depth, 0))}${
					n.type === 'endtag' ? '/' : ''
				}${n.nodeName}(${filter(n.uuid)})${n.type === 'starttag' && n.isGhost ? '[👻]' : ''}${
					n.type === 'starttag'
						? ` => ${n.pairNode ? `/${n.pairNode.nodeName}(${filter(n.pairNode.uuid)})` : '💀'}`
						: ''
				}`,
			);
			if (n.type === 'starttag' || n.type === 'psblock') {
				for (const c of n.childNodes ?? []) {
					lines.push(
						`${' '.repeat(15)}   ${'  '.repeat(Math.max(n.depth, 0))}┗━ ${c.type === 'endtag' ? '/' : ''}${
							c.nodeName
						}(${filter(c.uuid)})`,
					);
				}
			}
			return lines;
		})
		.filter(Boolean)
		.flat();
}

function tokenDebug<N extends MLASTToken>(n: N | null, type = '') {
	if (!n) {
		return 'NULL';
	}
	return `[${n.startLine}:${n.startCol}]>[${n.endLine}:${n.endCol}](${n.startOffset},${n.endOffset})${
		// @ts-ignore
		n.potentialName ?? n.nodeName ?? n.name ?? n.type ?? type
	}${'isGhost' in n && n.isGhost ? '(👻)' : ''}${'isBogus' in n && n.isBogus ? '(👿)' : ''}${'conditionalType' in n && n.conditionalType ? ` (${n.conditionalType})` : ''}: ${visibleWhiteSpace(
		n.raw,
	)}`;
}

function visibleWhiteSpace(chars: string) {
	return chars.replaceAll('\n', '⏎').replaceAll('\t', '→').replaceAll(/\s/g, '␣');
}

const uuidFilterMap = new Map<string, string>();
let increment = 0;
function uuidFilter(uuid: string) {
	if (!uuidFilterMap.has(uuid)) {
		const filteredId = increment.toString(16).padStart(4, '0');
		increment++;
		uuidFilterMap.set(uuid, filteredId);
	}
	return uuidFilterMap.get(uuid);
}
