import {
	VerifiedResult,
} from '../rule';

export async function standardReporter (targetPath: string, results: VerifiedResult[]) {
	if (results.length) {
		console.log(`❌ : ${targetPath} [markuplint]`);
		for (const result of results) {
			console.warn(`\t${targetPath}:${result.line}:${result.col} ${result.message} [markuplint]`);
		}
	} else {
		console.log(`✅ : ${targetPath} [markuplint]`);
	}
}
