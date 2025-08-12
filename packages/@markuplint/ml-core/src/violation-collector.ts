import type { Violation } from '@markuplint/ml-config';

export class ViolationCollector {
	#violations: Violation[] = [];
	#maxViolations: number = 0;
	#locked: boolean = false;

	constructor(maxViolations: number = 0) {
		this.#maxViolations = maxViolations;
		this.#locked = false;
	}

	push(...violations: Violation[]): number {
		if (this.#locked) {
			return this.#violations.length;
		}

		for (const violation of violations) {
			this.#violations.push(violation);

			if (this.#maxViolations > 0 && this.#violations.length >= this.#maxViolations) {
				this.#locked = true;
				break;
			}
		}

		return this.#violations.length;
	}

	get length(): number {
		return this.#violations.length;
	}

	isLocked(): boolean {
		return this.#locked;
	}

	toArray(): Violation[] {
		return [...this.#violations];
	}

	isTruncated(): boolean {
		return this.#locked && this.#maxViolations > 0;
	}

	getMaxViolations(): number {
		return this.#maxViolations;
	}
}
