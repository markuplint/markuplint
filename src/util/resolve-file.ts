import fetch from 'node-fetch';
import isRemoteFile from './is-remote-file';
import readTextFile from './read-text-file';

export async function resolveFile (address: string) {
	if (isRemoteFile(address)) {
		const res = await fetch(address);
		return await res.text();
	} else {
		return await readTextFile(address);
	}
}
