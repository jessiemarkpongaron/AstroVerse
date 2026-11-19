import { useEffect } from 'react';
import type { PageMeta } from '../lib/signPages.ts';

/** Sets the title and meta description while a page is shown, then restores them. */
export function useDocumentMeta(meta: PageMeta) {
  const { title, description } = meta;
  useEffect(() => {
    const tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const before = { title: document.title, description: tag?.content };
    document.title = title;
    if (tag) tag.content = description;
    return () => {
      document.title = before.title;
      if (tag && before.description !== undefined) tag.content = before.description;
    };
  }, [title, description]);
}
