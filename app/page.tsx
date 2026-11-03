import Memorial from "./memorial";
import { publicCatalog, candleStats } from "../lib/server";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [catalog, stats] = await Promise.all([publicCatalog().catch(() => null), candleStats().catch(() => null)]);
  return <Memorial initialCatalog={catalog} initialStats={stats} />;
}
