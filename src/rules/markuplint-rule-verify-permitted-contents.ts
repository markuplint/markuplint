import {
	Document,
	Element,
	Node,
} from '../parser';
import Rule from '../rule';
import {
	PermittedContent,
	Ruleset,
} from '../ruleset';

/**
 * `VerifyPermittedContents`
 *
 * *Core rule*
 */
export class VerifyPermittedContents extends Rule {
	public verify (document: Document, ruleset: Ruleset) {
		const reports: string[] = [];
		if (ruleset && ruleset.nodeRules) {
			for (const nodeRule of ruleset.nodeRules) {
				if (nodeRule.nodeType === '#root') {
					if (nodeRule.permittedContent) {
						reports.push(...checkPermittedContent(nodeRule.permittedContent, document.root.childNodes, nodeRule.nodeType));
					}
				}
				document.walk((node) => {
					if (node instanceof Element && node.nodeName === nodeRule.nodeType) {
						if (nodeRule.permittedContent) {
							reports.push(...checkPermittedContent(nodeRule.permittedContent, node.childNodes, nodeRule.nodeType));
						}
					}
				});
			}
		}
		return reports;
	}
}

export default new VerifyPermittedContents('verify-permitted-contents');

function checkPermittedContent (permittedContents: PermittedContent[], nodes: Node[], parentName: string) {
	const reports: string[] = [];

	for (const permittedContent of permittedContents) {
		const nodeName = permittedContent[0];
		const options = permittedContent[1];
		if (options && options.required) {
			let counter = 0;
			for (const node of nodes) {
				if (node.nodeName === nodeName) {
					counter++;
				}
			}
			// console.log(`<${nodeName}>(${counter}) in <${parentName}>`);
			switch (options.times) {
				case 'once': {
					if (counter !== 1) {
						reports.push(`<${nodeName}> is required that is premitted content of <${parentName}>.`);
					}
					break;
				}
				case 'one or more': {
					if (counter < 1) {
						reports.push(`<${nodeName}> is required one or more, premitted content of <${parentName}>.`);
					}
					break;
				}
			}
		}
	}

	return reports;
}
