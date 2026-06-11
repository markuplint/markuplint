import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function getJsonModule<T extends {}>(modulePath: string): T | null {
	try {
		return require(modulePath);
	} catch {
		return null;
	}
}
