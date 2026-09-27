import { ServerPage } from "../server-page";

export default (props: { searchParams: Promise<{ lang?: string }> }) => ServerPage("appshots", props);
