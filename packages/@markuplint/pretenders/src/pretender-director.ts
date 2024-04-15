import type { Identifier, Identity } from './types.js';

import { dependencyMapper } from './dependency-mapper.js';

type PretenderDirectorMap = Map<Identifier, [identity: Identity, filePath?: string]>;

export class PretenderDirector {
	#map: PretenderDirectorMap = new Map();

	add(identifier: Identifier, identity: Identity, filePath: string, line: number, col: number) {
		if (this.#map.has(identifier)) {
			return;
		}

		this.#map.set(identifier, [identity, `${filePath}:${line}:${col}`]);
	}

	getPretenders() {
		return dependencyMapper(this.#map);
	}
}
