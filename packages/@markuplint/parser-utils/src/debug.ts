import type { MLASTNode } from '@markuplint/ml-ast';

import debug from 'debug';

import { nodeListToDebugMaps } from './debugger.js';

export const log = debug('ml-parser');

export function domLog(nodeList: readonly (MLASTNode | null)[]) {
	log('Parse result: %O', nodeListToDebugMaps(nodeList, true));
}

export class PerformanceTimer {
	#logs: [string, number, number][] = [];
	#counter = -1;

	push(name?: string) {
		if (!log.enabled) {
			return '';
		}
		this.#counter++;
		const now = performance.now();

		const last = this.#logs.at(-1);
		if (last && Number.isNaN(last[2])) {
			last[2] = now;
		}

		name = name || `#${this.#counter}`;

		this.#logs.push([name, now, Number.NaN]);
	}

	log() {
		if (!log.enabled) {
			return;
		}

		this.push('end');
		this.#logs.pop();

		const map = new Map<string, [total: number, count: number]>();

		for (const content of this.#logs) {
			const diff = content[2] - content[1];
			const name = content[0];

			if (map.has(name)) {
				const [total, count] = map.get(name)!;
				map.set(name, [total + diff, count + 1]);
			} else {
				map.set(name, [diff, 1]);
			}
		}

		for (const [name, [total, count]] of map) {
			const avg = total / count;
			log.extend(name)('%dms (avg: %dms, count: %d)', total.toExponential(3), avg.toExponential(3), count);
		}
	}
}
