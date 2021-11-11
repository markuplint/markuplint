import fs from 'fs/promises';

export async function fsExists(path: string) {
	const stat = await fs.stat(path).catch(e => {
		if (e?.code === 'ENOENT') {
			return null;
		}
		throw e;
	});

	return !!stat;
}
