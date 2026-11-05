import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site-url";
export default function robots():MetadataRoute.Robots{const url=publicSiteUrl();return url?{rules:{userAgent:'*',allow:'/',disallow:['/admin','/api/','/mn/quote','/en/quote','/*?']},sitemap:new URL('/sitemap.xml',url).href}:{rules:{userAgent:'*',disallow:'/'}};}
