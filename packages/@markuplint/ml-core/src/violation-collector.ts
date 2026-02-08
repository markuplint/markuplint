import type { Violation } from '@markuplint/ml-config';

/**
 * Collects and manages lint violations across multiple files.
 * Supports a maximum violation count to stop collecting early.
 */
export class ViolationCollector {
	#violations: (Violation & { filePath: string })[] = [];
	#maxCount: number = 0;
	#locked: boolean = false;

	/**
	 * @param maxCount - Maximum number of violations to collect; 0 means unlimited
	 */
	constructor(maxCount: number = 0) {
		this.#maxCount = maxCount;
		this.#locked = false;
	}

	/**
	 * Adds violations associated with a specific file path.
	 * Stops collecting once the maximum count is reached.
	 *
	 * @param filePath - The file that produced these violations
	 * @param violations - The violations to add
	 * @returns The current total number of collected violations
	 */
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

	/**
	 * The total number of collected violations.
	 */
	get length(): number {
		return this.#violations.length;
	}

	/**
	 * Whether the collector has reached its maximum count and will no longer accept violations.
	 *
	 * @returns `true` if the collector is locked
	 */
	isLocked(): boolean {
		return this.#locked;
	}

	/**
	 * Returns a copy of all collected violations as an array.
	 *
	 * @returns An array of violations with their associated file paths
	 */
	toArray(): (Violation & { filePath: string })[] {
		return [...this.#violations];
	}

	/**
	 * Groups collected violations by their file path.
	 *
	 * @returns A Map from file path to an array of violations for that file
	 */
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
