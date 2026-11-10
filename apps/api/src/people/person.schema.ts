import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** Someone you can browse or publish as. Picked from a list; not an account. */
@Schema({ timestamps: true, collection: 'people' })
export class Person {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true, sparse: true })
  seedKey?: string;
}

export type PersonDocument = HydratedDocument<Person>;
export const PersonSchema = SchemaFactory.createForClass(Person);
PersonSchema.index({ name: 1, _id: 1 });
