import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/mongodb';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://verzus.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  try {
    const db = await getDb();
    const products = await db
      .collection('products')
      .find({ active: { $ne: false } })
      .project({ _id: 1, updatedAt: 1 })
      .toArray();

    for (const p of products) {
      entries.push({
        url: `${SITE_URL}/producto/${p._id.toString()}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch {
    // si DB falla, retornamos solo la home
  }

  return entries;
}
