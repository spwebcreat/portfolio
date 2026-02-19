import { getCollection, type CollectionEntry } from 'astro:content';

export const categoryLabels: Record<string, string> = {
  tech: 'Tech',
  knowledge: 'Knowledge',
  diary: 'Diary',
};

export const categoryColors: Record<string, string> = {
  tech: 'border-sky-400 text-sky-400',
  knowledge: 'border-primary text-primary',
  diary: 'border-emerald-400 text-emerald-400',
};

/** Get all published (non-draft) blog posts, sorted by pubDate descending */
export async function getPublishedPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });

  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
}

/** Get latest N published posts */
export async function getLatestPosts(count: number): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getPublishedPosts();
  return posts.slice(0, count);
}

/** Format a date as YYYY.MM.DD */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}
