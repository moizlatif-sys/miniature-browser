// Shapes returned by the NestJS API. Kept small and explicit on purpose.

export interface Person {
  id: string;
  name: string;
}

export interface SiteView {
  id: string;
  address: string;
  title: string;
  author: { id: string; name: string };
  safeHtml: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  address: string;
  title: string;
  authorName: string;
  excerpt: string;
  titleMatch: boolean;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  truncated: boolean;
}

export type VisitMethod = 'typed' | 'link' | 'back' | 'forward' | 'history' | 'search_result';

export interface VisitView {
  id: string;
  address: string;
  title: string;
  outcome: 'found' | 'not_found';
  method: VisitMethod;
  visitedAt: string;
}

export interface VisitPage {
  items: VisitView[];
  nextCursor: string | null;
}
