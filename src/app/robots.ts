import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/staff/", "/superadmin/", "/admin/", "/api/"],
    },
    sitemap: "https://attendaapp.com/sitemap.xml",
  };
}