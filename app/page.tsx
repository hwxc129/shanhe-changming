import Memorial from "./memorial";
import { candleStats } from "../lib/server";
export const dynamic = "force-dynamic";
export default async function Home() {
  const stats = await candleStats().catch(() => null);
  return <Memorial initialStats={stats} />;
}
