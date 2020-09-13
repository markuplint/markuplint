// import Playground from '../components/Playground';

import { useEffect, useRef } from 'react';
import Playground from '../modules/playground';

// export default function PlaygroundPage() {
// 	return <Playground />;
// }

export default function PlaygroundPage() {
	const pgEl = useRef<HTMLDivElement>();
	useEffect(() => {
		const pg = new Playground(pgEl.current);
		console.log(pg);
	});
	return <div ref={pgEl}></div>;
}
