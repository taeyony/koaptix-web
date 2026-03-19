import { HomeShell } from "../components/home/HomeShell";
import { getKoaptixHomePayload } from "../lib/koaptix/home";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getKoaptixHomePayload({
    topN: 50,
    chartPoints: 12,
  });

  return <HomeShell data={data} />;
}
