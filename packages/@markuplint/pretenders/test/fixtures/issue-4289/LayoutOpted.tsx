import { withLayout } from 'some-layout';

const Layout = ({ children }) => <main>{children}</main>;

/**
 * @pretends null
 */
function Inner() {
	return <article />;
}

export default withLayout(Layout)(Inner);
