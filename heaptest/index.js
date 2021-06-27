require('heapdump');
const markuplint = require('markuplint');
const path = require('path');

(async function () {
	const list = [
		'./fixture/001.html',
		'./fixture/002.html',
		'./fixture/003.html',
		'./fixture/004.html',
		'./fixture/005.html',
	];

	for (const filepath of list) {
		await markuplint.exec({
			files: path.join(__dirname, filepath),
		});

		global.gc();
		const heapUsed = process.memoryUsage().heapUsed;
		console.log(`Using ${heapUsed} bytes of Heap.`);

		process.kill(process.pid, 'SIGUSR2');
	}
})();
