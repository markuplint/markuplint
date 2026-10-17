import { withLayout } from 'some-layout';

const Layout = ({ children }) => <main>{children}</main>;

const WithLayout = () => <article />;

export default withLayout(Layout)(WithLayout);
