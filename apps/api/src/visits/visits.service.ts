import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { invalidInput } from '../common/api-error';
import { parseObjectId } from '../common/object-id';
import { PeopleService } from '../people/people.service';
import { requireAddress, SitesService } from '../sites/sites.service';
import { RecordVisitDto } from './visit.dto';
import { Visit, VisitMethod, VisitOutcome } from './visit.schema';

export interface VisitView {
  id: string;
  address: string;
  title: string;
  outcome: VisitOutcome;
  method: VisitMethod;
  visitedAt: string;
}

const DEFAULT_PAGE = 30;

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name) private readonly visits: Model<Visit>,
    private readonly people: PeopleService,
    private readonly sites: SitesService,
  ) {}

  /**
   * Records one arrival. The server decides the title, outcome and time; the
   * client only says who, where, how, and which event this is. Sending the
   * same eventId twice returns the original record instead of a duplicate.
   */
  async record(dto: RecordVisitDto): Promise<VisitView> {
    const existing = await this.visits.findOne({ eventId: dto.eventId }).lean();
    if (existing) return toView(existing);

    const personId = parseObjectId(dto.personId, 'personId');
    await this.people.require(personId, 'personId');
    const address = requireAddress(dto.address);
    const site = await this.sites.findMeta(address);

    try {
      const created = await this.visits.create({
        personId,
        address,
        siteId: site?.id,
        titleSnapshot: site?.title ?? address,
        outcome: site ? 'found' : 'not_found',
        method: dto.method,
        navigationEntryId: dto.navigationEntryId,
        eventId: dto.eventId,
        visitedAt: new Date(),
      });
      return toView(created.toObject());
    } catch (err) {
      // A concurrent retry of the same event got there first: return that record.
      if ((err as { code?: number }).code === 11000) {
        const winner = await this.visits.findOne({ eventId: dto.eventId }).lean();
        if (winner) return toView(winner);
      }
      throw err;
    }
  }

  /** Newest-first history for one person, paginated by (visitedAt, _id). */
  async listForPerson(rawPersonId: string, cursor?: string, limit = DEFAULT_PAGE) {
    const personId = parseObjectId(rawPersonId, 'personId');
    await this.people.require(personId, 'personId');

    const filter: FilterQuery<Visit> = { personId };
    if (cursor) {
      const { visitedAt, id } = decodeCursor(cursor);
      filter.$or = [{ visitedAt: { $lt: visitedAt } }, { visitedAt, _id: { $lt: id } }];
    }

    const rows = await this.visits
      .find(filter)
      .sort({ visitedAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map(toView),
      nextCursor: rows.length > limit && last ? encodeCursor(last.visitedAt, last._id) : null,
    };
  }
}

function toView(v: Visit & { _id: Types.ObjectId }): VisitView {
  return {
    id: String(v._id),
    address: v.address,
    title: v.titleSnapshot,
    outcome: v.outcome,
    method: v.method,
    visitedAt: v.visitedAt.toISOString(),
  };
}

function encodeCursor(visitedAt: Date, id: Types.ObjectId): string {
  return Buffer.from(visitedAt.toISOString() + '|' + String(id)).toString('base64url');
}

function decodeCursor(cursor: string): { visitedAt: Date; id: Types.ObjectId } {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  const visitedAt = new Date(iso ?? '');
  if (!id || Number.isNaN(visitedAt.getTime()) || !Types.ObjectId.isValid(id)) {
    throw invalidInput({ cursor: 'Invalid cursor.' });
  }
  return { visitedAt, id: new Types.ObjectId(id) };
}
