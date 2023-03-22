import type {
	FormattedPrimitiveTypeCheck,
	MatchedResult,
	UnmatchedResult,
	UnmatchedResultOptions,
	UnmatchedResultReason,
} from './types';
import type { ReadonlyDeep, WritableDeep } from 'type-fest';

export function matches(
	checker: FormattedPrimitiveTypeCheck,
	options?: ReadonlyDeep<
		UnmatchedResultOptions & {
			ref?: string;
			reason?: UnmatchedResultReason;
		}
	>,
) {
	return (value: string) => {
		const valid = checker(value);
		if (!valid && !value) {
			return unmatched(value, 'empty-token', options);
		}
		return valid ? matched() : unmatched(value, options?.reason, options);
	};
}

export function matched(): MatchedResult {
	return {
		matched: true,
	};
}

export function unmatched(
	value: string,
	reason?: ReadonlyDeep<UnmatchedResultReason>,
	options?: ReadonlyDeep<
		UnmatchedResultOptions & {
			ref?: string;
		}
	>,
): UnmatchedResult {
	const _options = options as WritableDeep<
		UnmatchedResultOptions & {
			ref?: string;
		}
	>;
	return {
		..._options,
		matched: false,
		ref: options?.ref || null,
		raw: value,
		offset: 0,
		length: value.length,
		line: 1,
		column: 1,
		reason: reason ?? 'syntax-error',
	};
}
