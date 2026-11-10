import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiError, invalidInput } from '../common/api-error';
import { isValidAddress, normalizeAddress } from '../common/address';
import { Person } from '../people/person.schema';
import { Site } from './site.schema';

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
export class SitesService {
  constructor(@InjectModel(Site.name) private readonly sites: Model<Site>) {}

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
