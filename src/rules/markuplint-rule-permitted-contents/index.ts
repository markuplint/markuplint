import {
	Document,
	Element,
	Node,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifyReturn,
} from '../../rule';
import Ruleset from '../../ruleset';

/**
 * `VerifyPermittedContents`
 *
 * *Core rule*
 */
export default class extends Rule {
	public name = 'permitted-contents';

	public async verify (document: Document<null, {}>, config: RuleConfig, ruleset: Ruleset) {
		const reports: VerifyReturn[] = [];
		// if (ruleset && ruleset.nodeRules) {
		// 	for (const nodeRule of ruleset.nodeRules) {
		// 		if (nodeRule.nodeType === '#root') {
		// 			if (nodeRule.permittedContent) {
		// 				reports.push(...checkPermittedContent(nodeRule.permittedContent, document.root.childNodes, nodeRule.nodeType));
		// 			}
		// 		}
		// 		await document.walk(async (node) => {
		// 			if (node instanceof Element && node.nodeName === nodeRule.nodeType) {
		// 				if (nodeRule.permittedContent) {
		// 					reports.push(...checkPermittedContent(nodeRule.permittedContent, node.childNodes, nodeRule.nodeType));
		// 				}
		// 			}
		// 		});
		// 	}
		// }
		return reports;
	}
}

// function checkPermittedContent (permittedContents: PermittedContent[], nodes: Node[], parentName: string) {
// 	const reports: VerifyReturn[] = [];

// 	for (const permittedContent of permittedContents) {
// 		const nodeName = permittedContent[0];
// 		const options = permittedContent[1];
// 		if (options && options.required) {
// 			let counter = 0;
// 			for (const node of nodes) {
// 				if (node.nodeName === nodeName) {
// 					counter++;
// 				}
// 			}
// 			// console.log(`<${nodeName}>(${counter}) in <${parentName}>`);
// 			switch (options.times) {
// 				case 'once': {
// 					if (counter !== 1) {
// 						reports.push({
// 							level: 'error',
// 							message: `<${nodeName}> is required that is premitted content of <${parentName}>.`,
// 							line: 0,
// 							col: 0,
// 							raw: '',
// 						});
// 					}
// 					break;
// 				}
// 				case 'one or more': {
// 					if (counter < 1) {
// 						reports.push({
// 							level: 'error',
// 							message: `<${nodeName}> is required one or more, premitted content of <${parentName}>.`,
// 							line: 0,
// 							col: 0,
// 							raw: '',
// 						});
// 					}
// 					break;
// 				}
// 			}
// 		}
// 	}

// 	return reports;
// }
