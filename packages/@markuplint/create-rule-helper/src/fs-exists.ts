import { promises as fs } from 'fs';

export async function fsExists(path: string) {
	const stat = await fs.stat(path).catch(e => {
		if (e?.code === 'ENOENT') {
			return null;
		}
		throw e;
	});

	return !!stat;
}
