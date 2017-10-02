import parser from './parser';
import Rule from './rule';
import {
	Ruleset,
} from './ruleset';

export function verify (html: string, ruleset: Ruleset, rules: Rule[]) {
	const nodeTree = parser(html);
	const reports: string[] = [];
	const permittedContentStacks: string[] = [];
	if (ruleset && ruleset.nodeRules) {
		for (const nodeRule of ruleset.nodeRules) {
			if (nodeRule.nodeType === '#root') {
				if (nodeRule.permittedContent) {
					for (const permittedContent of nodeRule.permittedContent) {
						const nodeName = permittedContent[0];
						const options = permittedContent[1];
						if (options && options.required) {
							permittedContentStacks.push(nodeName);
						}
					}
				}
			}
			nodeTree.walk((n) => {
				if (n.nodeName === nodeRule.nodeType) {
					// console.log({[nodeRule.nodeType]: nodeRule});
					if (permittedContentStacks.includes(n.nodeName)) {
						const i = permittedContentStacks.lastIndexOf(n.nodeName);
						permittedContentStacks.splice(i, 1);
						console.log(permittedContentStacks, n.nodeName, i);
					}
					if (nodeRule.permittedContent) {
						for (const permittedContent of nodeRule.permittedContent) {
							const nodeName = permittedContent[0];
							const options = permittedContent[1];
							if (options && options.required) {
								permittedContentStacks.push(nodeName);
							}
						}
					}
				}
			});
		}
	}
	for (const stack of permittedContentStacks) {
		reports.push(`${stack} is required.`);
	}
	if (ruleset && ruleset.rules && ruleset.rules.require) {
		// for (const require in ruleset.rules.require) {
		// 	if (ruleset.rules.require.hasOwnProperty(require)) {
		// 		let isExist = false;
		// 		nodeTree.walk((n) => {
		// 			if (n.nodeName === require) {
		// 				isExist = true;
		// 			}
		// 		});
		// 		if (!isExist) {
		// 			reports.push(`${require} is reqired.`)
		// 		}
		// 	}
		// }
	}
	return reports;
}
