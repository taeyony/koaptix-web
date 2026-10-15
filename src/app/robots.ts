import type { MetadataRoute } from "next";
import { PUBLIC_SITE_ORIGIN } from "../lib/koaptix/publicPageData";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${PUBLIC_SITE_ORIGIN}/sitemap.xml` };
}
