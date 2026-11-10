import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { invalidInput } from '../common/api-error';
import { Person } from '../people/person.schema';
import { Site } from '../sites/site.schema';

export interface SearchResult {
  id: string;
  address: string;
  title: string;
  authorName: string;
  excerpt: string;
  titleMatch: boolean;
}

const MAX_QUERY = 200;
const EXCERPT_BEFORE = 70;
const EXCERPT_AFTER = 170;

/** Makes user text safe to embed in a RegExp: every metacharacter is escaped. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type Row = { _id: Types.ObjectId; address: string; title: string; bodyText: string; authorId: Person & { _id: Types.ObjectId } };

/**
 * Case-insensitive substring search over titles and visible page text.
 *
 * Ranking is deterministic: pages whose title matches come first, then pages
 * that match only in their body; ties are broken by address. This is a
 * bounded scan, fine for hundreds of modest pages. A large web would move
 * this to an indexed search engine.
 */
@Injectable()
export class SearchService {
  constructor(@InjectModel(Site.name) private readonly sites: Model<Site>) {}

  async search(rawQuery: string | undefined, limit = 20) {
    const query = (rawQuery ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY);
    if (!query) throw invalidInput({ q: 'Type something to search for.' });

    const pattern = new RegExp(escapeRegex(query), 'i');
    const fields = 'address title bodyText authorId';

    // Fetch one extra row in each group so we know whether results were cut off.
    const titleHits = await this.sites
      .find({ title: pattern })
      .select(fields)
      .sort({ address: 1 })
      .limit(limit + 1)
      .populate('authorId', 'name')
      .lean<Row[]>();

    const remaining = Math.max(0, limit + 1 - titleHits.length);
    const bodyHits = remaining
      ? await this.sites
          .find({ title: { $not: pattern }, bodyText: pattern })
          .select(fields)
          .sort({ address: 1 })
          .limit(remaining)
          .populate('authorId', 'name')
          .lean<Row[]>()
      : [];

    const ranked = [...titleHits.map((r) => ({ r, titleMatch: true })), ...bodyHits.map((r) => ({ r, titleMatch: false }))];
    const results: SearchResult[] = ranked.slice(0, limit).map(({ r, titleMatch }) => ({
      id: String(r._id),
      address: r.address,
      title: r.title,
      authorName: r.authorId?.name ?? 'Unknown',
      excerpt: excerpt(r.bodyText, query),
      titleMatch,
    }));

    return { query, results, truncated: ranked.length > limit };
  }
}

/** A plain-text window around the first body match, or the opening of the page. */
export function excerpt(text: string, query: string): string {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return clip(text, 0, EXCERPT_BEFORE + EXCERPT_AFTER);
  return clip(text, Math.max(0, at - EXCERPT_BEFORE), at + query.length + EXCERPT_AFTER);
}

function clip(text: string, start: number, end: number): string {
  let s = start;
  let e = Math.min(text.length, end);
  // Snap to word boundaries so the excerpt does not start or end mid-word.
  if (s > 0) {
    const space = text.indexOf(' ', s);
    if (space !== -1 && space < s + 20) s = space + 1;
  }
  if (e < text.length) {
    const space = text.lastIndexOf(' ', e);
    if (space > e - 20) e = space;
  }
  return `${s > 0 ? '… ' : ''}${text.slice(s, e).trim()}${e < text.length ? ' …' : ''}`;
}
