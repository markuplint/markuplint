import readJSON from './read-json';

export function setPermittedContent(tagName: string) {
	return readJSON(`../src/permitted-structures/${tagName.toLowerCase()}.json`, {
		tag: tagName,
		contents: true,
	});
}
