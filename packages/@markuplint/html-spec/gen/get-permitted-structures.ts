import readJSON from './read-json';

export function getPermittedStructures(tagName: string, namespace = '') {
	const fileName = namespace ? `${namespace}_${tagName}` : tagName.toLowerCase();
	return readJSON(`../src/permitted-structures/${fileName}.json`, {
		tag: tagName,
		contents: true,
	});
}
