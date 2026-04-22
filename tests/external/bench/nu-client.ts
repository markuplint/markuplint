export type NuClientOptions = {
	readonly baseUrl: string;
	readonly timeoutMs?: number;
	readonly retries?: number;
};

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

export type NuValidationResult =
	| { readonly ok: true; readonly messages: readonly NuRawMessage[] }
	| { readonly ok: false; readonly error: string };

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
