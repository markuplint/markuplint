import { stat } from 'node:fs/promises';

export async function fsExists(path: string) {
	const res = await stat(path).catch(e => {
		if (e?.code === 'ENOENT') {
			return null;
		}
		throw e;
	});

	return !!res;
}
