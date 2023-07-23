import { MLEngine } from 'markuplint';

async function main() {
	const file = await MLEngine.toMLFile('../../fixture/002.html');

	if (!file) {
		return;
	}

	const engine = new MLEngine(file, {
		locale: 'en',
	});

	await engine.exec();
}

await main();
