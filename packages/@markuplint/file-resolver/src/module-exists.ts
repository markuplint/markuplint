import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export async function moduleExists(name: string) {
	try {
		await import(name);
	} catch (error) {
		if (
			// @ts-ignore
			'code' in error &&
			// @ts-ignore
			error.code === 'ERR_IMPORT_ASSERTION_TYPE_MISSING'
		) {
			// It exists, but it is may be a JSON file.
			return true;
		}

		if (error instanceof Error && /^parse failure/i.test(error.message)) {
			// It exists, but it failed to parse.
			return true;
		}

		try {
			require.resolve(name);
		} catch (error) {
			if (
				// @ts-ignore
				'code' in error &&
				// @ts-ignore
				error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED'
			) {
				// Even if there are issues with the fields,
				// assume that the module exists and return true.
				return true;
			}

			if (
				// @ts-ignore
				'code' in error &&
				// @ts-ignore
				error.code === 'MODULE_NOT_FOUND'
			) {
				return false;
			}

			throw error;
		}
	}

	return true;
}
