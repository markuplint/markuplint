import { AppFrame } from './AppFrame';
import { Header } from './Header';
import { Config } from './Config';
import { Editor } from './Editor';
import { Logger } from './Logger';
import { Footer } from './Footer';

function App() {
	return (
		<AppFrame header={<Header />} config={<Config />} editor={<Editor />} logger={<Logger />} footer={<Footer />} />
	);
}

export default App;
