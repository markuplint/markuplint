import { stat } from 'node:fs/promises';

export async function fsExists(path: string) {
	const res = await stat(path).catch(error => {
		if (error?.code === 'ENOENT') {
			return null;
		}
		throw error;
	});

	return !!res;
}
