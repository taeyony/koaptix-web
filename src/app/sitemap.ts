import type { MetadataRoute } from "next";
import { getRankingUniverseRegistry } from "../lib/koaptix/universes";
import { getPublicPageBoard, PUBLIC_SITE_ORIGIN } from "../lib/koaptix/publicPageData";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const regions = getRankingUniverseRegistry().filter(item => item.scope === "MACRO");
  const entries: MetadataRoute.Sitemap = [{ url: PUBLIC_SITE_ORIGIN }, { url: `${PUBLIC_SITE_ORIGIN}/play` }];
  // Bound concurrent reads during cold builds; never list an unverified region.
  for (let offset = 0; offset < regions.length; offset += 3) {
    const results = await Promise.allSettled(regions.slice(offset, offset + 3).map(async region => ({
      region, rows: await getPublicPageBoard(region.code, region.code === "KOREA_ALL" ? 1000 : 1),
    })));
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value.rows.length) continue;
      const { region, rows } = result.value;
      entries.push({ url: `${PUBLIC_SITE_ORIGIN}/ranking${region.code === "KOREA_ALL" ? "" : `?universe=${region.code}`}`, lastModified: rows[0].published_at });
      if (region.code === "KOREA_ALL") {
        for (const row of rows) entries.push({ url: `${PUBLIC_SITE_ORIGIN}/complex/${row.complex_id}`, lastModified: row.published_at });
      }
    }
  }
  return entries;
}
