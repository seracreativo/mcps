import { ServerPage } from "../server-page";

export default (props: { searchParams: Promise<{ lang?: string }> }) => ServerPage("appledocs", props);
