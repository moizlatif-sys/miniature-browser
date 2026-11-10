import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const VISIT_METHODS = ['typed', 'link', 'back', 'forward', 'history', 'search_result'] as const;
export type VisitMethod = (typeof VISIT_METHODS)[number];
export type VisitOutcome = 'found' | 'not_found';

/** A recorded fact: this person arrived at this address at this time, this way. */
@Schema({ collection: 'visits' })
export class Visit {
  @Prop({ type: Types.ObjectId, required: true })
  personId: Types.ObjectId;

  @Prop({ required: true })
  address: string;

  @Prop({ type: Types.ObjectId })
  siteId?: Types.ObjectId;

  @Prop({ required: true })
  titleSnapshot: string;

  @Prop({ required: true, enum: ['found', 'not_found'] })
  outcome: VisitOutcome;

  @Prop({ required: true, enum: VISIT_METHODS })
  method: VisitMethod;

  /** The browser's navigation entry this arrival belongs to (several arrivals can share one). */
  @Prop({ required: true })
  navigationEntryId: string;

  /** Client-generated id for one arrival; makes retries idempotent. */
  @Prop({ required: true, unique: true })
  eventId: string;

  @Prop({ required: true })
  visitedAt: Date;

  @Prop({ unique: true, sparse: true })
  seedKey?: string;
}

export type VisitDocument = HydratedDocument<Visit>;
export const VisitSchema = SchemaFactory.createForClass(Visit);
VisitSchema.index({ personId: 1, visitedAt: -1, _id: -1 });
