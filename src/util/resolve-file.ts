import fetch from 'node-fetch';
import readTextFile from '../util/read-text-file';
import isRemoteFile from './is-remote-file';

export async function resolveFile (address: string) {
	if (isRemoteFile(address)) {
		const res = await fetch(address);
		return await res.text();
	} else {
		return await readTextFile(address);
	}
}
