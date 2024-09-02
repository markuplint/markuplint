import type { Identifier, Identity } from './types.js';
import type { Pretender } from '@markuplint/ml-config';

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

export function dependencyMapper(map: Readonly<PretenderDirectorMap>): Pretender[] {
	const linkedPretenders: Pretender[] = [];

	const collection = [...map.entries()];

	for (const [identifier, [_identity, _filePath]] of collection) {
		let identity = _identity;
		let filePath = _filePath;
		let elName = getElName(identity);
		const via: string[] = [];

		while (true) {
			const mappedPretender = map.get(elName);
			if (!mappedPretender) {
				break;
			}

			identity = mappedPretender[0];
			filePath = mappedPretender[1];

			if (elName === identifier) {
				via.push('...[Recursive]');
				break;
			}

			via.push(elName);
			elName = getElName(identity);
		}

		const pretender: Pretender = {
			selector: identifier,
			as: identity,
		};
		if (filePath) {
			// @ts-ignore initialize readonly property
			pretender.filePath = filePath;
		}
		if (via.length > 0) {
			// @ts-ignore
			pretender._via = via;
		}

		linkedPretenders.push(pretender);
	}

	return linkedPretenders.sort(propSort('selector'));
}

function getElName(identity: Identity) {
	if (typeof identity === 'string') {
		return identity;
	}
	return identity.element;
}

function propSort<T, P extends keyof T>(propName: P) {
	return (a: T, b: T) => {
		const nameA = toLowerCase(a[propName]);
		const nameB = toLowerCase(b[propName]);
		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}

		return 0;
	};
}

function toLowerCase<T>(value: T): T {
	if (typeof value === 'string') {
		// @ts-ignore
		return value.toLowerCase();
	}
	return value;
}
