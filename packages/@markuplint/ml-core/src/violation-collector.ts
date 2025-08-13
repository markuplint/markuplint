import type { Violation } from '@markuplint/ml-config';

export class ViolationCollector {
	#violations: (Violation & { filePath: string })[] = [];
	#maxCount: number = 0;
	#locked: boolean = false;

	constructor(maxCount: number = 0) {
		this.#maxCount = maxCount;
		this.#locked = false;
	}

	pushWithFile(filePath: string, ...violations: readonly Violation[]): number {
		if (this.#locked) {
			return this.#violations.length;
		}

		for (const violation of violations) {
			this.#violations.push({ ...violation, filePath });

			if (this.#maxCount > 0 && this.#violations.length >= this.#maxCount) {
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

	toArray(): (Violation & { filePath: string })[] {
		return [...this.#violations];
	}

	groupByFile(): Map<string, Violation[]> {
		const grouped = new Map<string, Violation[]>();
		for (const violation of this.#violations) {
			const { filePath, ...violationWithoutPath } = violation;
			if (!grouped.has(filePath)) {
				grouped.set(filePath, []);
			}
			grouped.get(filePath)!.push(violationWithoutPath);
		}
		return grouped;
	}
}
