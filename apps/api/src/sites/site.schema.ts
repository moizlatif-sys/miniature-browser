import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Person } from '../people/person.schema';

/** One page of HTML published at its own address. */
@Schema({ timestamps: true, collection: 'sites' })
export class Site {
  @Prop({ required: true, unique: true })
  address: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: Person.name, required: true, index: true })
  authorId: Types.ObjectId;

  /** What the author submitted. Never rendered, never returned by reads. */
  @Prop({ required: true, select: false })
  sourceHtml: string;

  /** Output of the HTML policy. The only markup that ever reaches a browser. */
  @Prop({ required: true })
  safeHtml: string;

  /** Visible text of safeHtml, used for search. */
  @Prop({ required: true })
  bodyText: string;

  /** Which HTML policy produced safeHtml; older versions are reprocessed on read. */
  @Prop({ required: true })
  sanitizerVersion: number;

  @Prop({ unique: true, sparse: true })
  seedKey?: string;

  updatedAt?: Date;
}

export type SiteDocument = HydratedDocument<Site>;
export const SiteSchema = SchemaFactory.createForClass(Site);
