import { isFatalError } from '@markuplint/shared';

/** Caller-facing knobs for `validate`. */
export type NuClientOptions = {
	/** Base URL of the running nu-validator, e.g. `http://localhost:28888`. */
	readonly baseUrl: string;
	/** Per-request timeout in milliseconds. Defaults to 15 s. */
	readonly timeoutMs?: number;
	/** Retry budget for a single `validate` call. Defaults to 3 attempts. */
	readonly retries?: number;
};

/**
 * Raw nu-validator message as returned by the HTTP API before any
 * benchmark-side normalisation.
 */
export type NuRawMessage = {
	readonly type: 'error' | 'warning' | 'info' | 'non-document-error';
	readonly subType?: string;
	readonly message: string;
	readonly firstLine?: number;
	readonly lastLine?: number;
	readonly firstColumn?: number;
	readonly lastColumn?: number;
	readonly extract?: string;
	readonly hiliteStart?: number;
	readonly hiliteLength?: number;
};

type NuApiResponse = {
	readonly messages?: readonly NuRawMessage[];
};

/**
 * Outcome of a single `validate` call. `ok: false` reports whether the call
 * failed because of a timeout (distinguished so callers can flag flakes) or
 * another recoverable error.
 */
export type NuValidationResult =
	| { readonly ok: true; readonly messages: readonly NuRawMessage[] }
	| { readonly ok: false; readonly error: string };

/**
 * POST `html` to nu-validator and return its parsed messages. Fatal errors
 * (Tier 1 per `isFatalError()` in `@markuplint/shared`) propagate without
 * being retried. Timeouts and ordinary request failures are retried up to
 * `retries` times.
 *
 * @param html HTML source to submit, as a UTF-8 string.
 * @param options Endpoint and retry configuration.
 * @returns Either the parsed message list or a structured failure.
 */
export async function validate(html: string, options: NuClientOptions): Promise<NuValidationResult> {
	const timeoutMs = options.timeoutMs ?? 15_000;
	const retries = options.retries ?? 3;
	let lastError: unknown;
	let timedOut = false;

	for (let attempt = 0; attempt < retries; attempt++) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const response = await fetch(`${options.baseUrl}/?out=json`, {
				method: 'POST',
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
					'User-Agent': 'markuplint-bench',
				},
				body: html,
				signal: controller.signal,
			});
			if (!response.ok) {
				throw new Error(`nu-validator returned HTTP ${response.status}`);
			}
			const body = (await response.json()) as NuApiResponse;
			return { ok: true, messages: body.messages ?? [] };
		} catch (err) {
			if (isFatalError(err)) {
				throw err;
			}
			lastError = err;
			if (controller.signal.aborted) {
				timedOut = true;
			}
		} finally {
			clearTimeout(timer);
		}
	}

	return {
		ok: false,
		error: timedOut ? 'timeout' : `failed after ${retries} attempts: ${String(lastError)}`,
	};
}
