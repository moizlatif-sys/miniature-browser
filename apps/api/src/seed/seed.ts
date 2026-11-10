import { createHash } from 'crypto';
import { Connection, Model, Types } from 'mongoose';
import { prepareHtml } from '../html-policy/html-policy';
import { Person, PersonSchema } from '../people/person.schema';
import { Site, SiteSchema } from '../sites/site.schema';
import { Visit, VisitSchema } from '../visits/visit.schema';
import { HISTORY, PEOPLE, SEED_EPOCH, SITES } from './seed-data';

/** Same seed key → same ObjectId, every run, on every machine. */
export function seedObjectId(key: string): Types.ObjectId {
  return new Types.ObjectId(createHash('sha256').update(key).digest('hex').slice(0, 24));
}

/** Same seed key → same UUID-v4-shaped event id. */
function seedUuid(key: string): string {
  const h = createHash('sha256').update(key).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * Upserts the seeded web. Running it twice leaves exactly one copy of
 * everything it owns. It never touches pages or visits people created
 * themselves, and it refuses to overwrite a user page at a seed address.
 */
export async function runSeed(connection: Connection, log: (line: string) => void = console.log) {
  const people: Model<Person> = connection.model(Person.name, PersonSchema);
  const sites: Model<Site> = connection.model(Site.name, SiteSchema);
  const visits: Model<Visit> = connection.model(Visit.name, VisitSchema);
  await Promise.all([people.init(), sites.init(), visits.init()]);

  for (const p of PEOPLE) {
    const seedKey = `person:${p.key}`;
    await people.updateOne(
      { _id: seedObjectId(seedKey) },
      { $set: { name: p.name, seedKey } },
      { upsert: true },
    );
  }
  log(`people: ${PEOPLE.length}`);

  const conflicts: string[] = [];
  const siteIds = new Map<string, { id: Types.ObjectId; title: string }>();
  for (const s of SITES) {
    const seedKey = `site:${s.key}`;
    const id = seedObjectId(seedKey);
    const occupant = await sites.findOne({ address: s.address }, { seedKey: 1 }).lean();
    if (occupant && occupant.seedKey !== seedKey) {
      conflicts.push(s.address);
      continue;
    }
    const prepared = prepareHtml(s.html);
    await sites.updateOne(
      { _id: id },
      {
        $set: {
          address: s.address,
          title: s.title,
          authorId: seedObjectId(`person:${s.author}`),
          sourceHtml: s.html,
          safeHtml: prepared.safeHtml,
          bodyText: prepared.bodyText,
          sanitizerVersion: prepared.version,
          seedKey,
        },
      },
      { upsert: true },
    );
    siteIds.set(s.address, { id, title: s.title });
  }
  log(`sites: ${siteIds.size}`);
  if (conflicts.length) {
    log(`skipped (address already used by a non-seed page): ${conflicts.join(', ')}`);
  }

  let visitCount = 0;
  for (const [personKey, steps] of Object.entries(HISTORY)) {
    const personId = seedObjectId(`person:${personKey}`);
    for (const [i, [minutes, address, method]] of steps.entries()) {
      const seedKey = `visit:${personKey}:${i}`;
      const site = siteIds.get(address);
      await visits.updateOne(
        { seedKey },
        {
          $set: {
            personId,
            address,
            siteId: site?.id,
            titleSnapshot: site?.title ?? address,
            outcome: site ? 'found' : 'not_found',
            method,
            navigationEntryId: `seed-${personKey}-${i}`,
            eventId: seedUuid(seedKey),
            visitedAt: new Date(SEED_EPOCH.getTime() + minutes * 60_000),
          },
          $setOnInsert: { _id: seedObjectId(seedKey) },
        },
        { upsert: true },
      );
      visitCount++;
    }
  }
  log(`visits: ${visitCount}`);
}
