import { HttpStatus, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiError, FieldErrors, invalidInput } from '../common/api-error';
import { isValidAddress, normalizeAddress } from '../common/address';
import { HTML_POLICY_VERSION, prepareHtml, PreparedHtml } from '../html-policy/html-policy';
import { PeopleService } from '../people/people.service';
import { Person } from '../people/person.schema';
import { CreateSiteDto } from './create-site.dto';
import { Site } from './site.schema';

export const MAX_TITLE = 120;
export const MAX_HTML_BYTES = 100 * 1024;

export interface SiteView {
  id: string;
  address: string;
  title: string;
  author: { id: string; name: string };
  safeHtml: string;
  updatedAt: string;
}

/** Validates and normalizes an address, or throws a 400 field error. */
export function requireAddress(raw: unknown, field = 'address'): string {
  const address = normalizeAddress(String(raw ?? ''));
  if (!isValidAddress(address)) {
    throw invalidInput(
      { [field]: 'Use a name like garden.zz: letters, digits and hyphens, ending in .zz.' },
      'That is not a valid address.',
    );
  }
  return address;
}

@Injectable()
export class SitesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SitesService.name);

  constructor(
    @InjectModel(Site.name) private readonly sites: Model<Site>,
    private readonly people: PeopleService,
  ) {}

  /**
   * Publishes a page. All field problems are reported together. The unique
   * index on `address` is what makes "first one wins" atomic; there is no
   * check-then-insert race to lose.
   */
  async create(dto: CreateSiteDto): Promise<SiteView> {
    const errors: FieldErrors = {};

    const address = normalizeAddress(dto.address);
    if (!isValidAddress(address)) errors.address = 'Use a name like garden.zz: letters, digits and hyphens, ending in .zz.';

    const title = dto.title.replace(/\s+/g, ' ').trim();
    if (title.length < 1 || title.length > MAX_TITLE) errors.title = `Give the page a title of 1–${MAX_TITLE} characters.`;

    const bytes = Buffer.byteLength(dto.html, 'utf8');
    let prepared: PreparedHtml | null = null;
    if (bytes > MAX_HTML_BYTES) {
      errors.html = `The page is ${Math.ceil(bytes / 1024)} KiB; the limit is ${MAX_HTML_BYTES / 1024} KiB.`;
    } else {
      prepared = prepareHtml(dto.html);
      if (!prepared.bodyText) errors.html = 'Nothing readable is left after removing unsupported HTML. Add some text.';
    }

    const authorId = new Types.ObjectId(dto.authorId);
    const author = await this.people.find(authorId);
    if (!author) errors.authorId = 'No such person.';

    if (Object.keys(errors).length || !prepared || !author) throw invalidInput(errors);

    try {
      const site = await this.sites.create({
        address,
        title,
        authorId,
        sourceHtml: dto.html,
        safeHtml: prepared.safeHtml,
        bodyText: prepared.bodyText,
        sanitizerVersion: prepared.version,
      });
      return {
        id: String(site._id),
        address: site.address,
        title: site.title,
        author,
        safeHtml: site.safeHtml,
        updatedAt: (site.updatedAt ?? new Date()).toISOString(),
      };
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new ApiError(HttpStatus.CONFLICT, 'ADDRESS_TAKEN', `Someone has already published at ${address}.`, {
          address: `${address} is taken. Pick another name.`,
        });
      }
      throw err;
    }
  }

  /**
   * Pages stored under an older HTML policy are re-sanitized from their
   * source before the API serves anything, so a policy change can never
   * leave stale markup being rendered or searched.
   */
  async onApplicationBootstrap() {
    const stale = await this.sites
      .find({ sanitizerVersion: { $lt: HTML_POLICY_VERSION } })
      .select('+sourceHtml');
    for (const site of stale) {
      const prepared = prepareHtml(site.sourceHtml);
      site.safeHtml = prepared.safeHtml;
      site.bodyText = prepared.bodyText;
      site.sanitizerVersion = prepared.version;
      await site.save();
    }
    if (stale.length) this.logger.log(`Reprocessed ${stale.length} page(s) with HTML policy v${HTML_POLICY_VERSION}`);
  }

  /** Light lookup used to resolve visits: returns null when nothing lives there. */
  async findMeta(address: string): Promise<{ id: Types.ObjectId; title: string } | null> {
    const site = await this.sites.findOne({ address }, { _id: 1, title: 1 }).lean();
    return site ? { id: site._id, title: site.title } : null;
  }

  async getByAddress(rawAddress: string): Promise<SiteView> {
    const address = requireAddress(rawAddress);
    const site = await this.sites
      .findOne({ address })
      .populate<{ authorId: Person & { _id: Types.ObjectId } }>('authorId', 'name')
      .lean();
    if (!site) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'SITE_NOT_FOUND', `Nothing is published at ${address}.`);
    }
    return {
      id: String(site._id),
      address: site.address,
      title: site.title,
      author: { id: String(site.authorId._id), name: site.authorId.name },
      safeHtml: site.safeHtml,
      updatedAt: (site.updatedAt ?? new Date(0)).toISOString(),
    };
  }
}
