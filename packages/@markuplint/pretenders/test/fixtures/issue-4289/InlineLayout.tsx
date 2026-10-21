import { withLayout } from 'some-layout';

const InlineLayout = () => <article />;

export default withLayout(({ children }) => <main>{children}</main>)(InlineLayout);
