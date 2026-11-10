import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { invalidInput } from '../common/api-error';
import { Person } from './person.schema';

export interface PersonView {
  id: string;
  name: string;
}

@Injectable()
export class PeopleService {
  constructor(@InjectModel(Person.name) private readonly people: Model<Person>) {}

  async list(): Promise<PersonView[]> {
    const rows = await this.people.find().sort({ name: 1, _id: 1 }).lean();
    return rows.map((p) => ({ id: String(p._id), name: p.name }));
  }

  /** Throws a field error if the person does not exist. People are never created implicitly. */
  async require(id: Types.ObjectId, field: string): Promise<PersonView> {
    const person = await this.people.findById(id).lean();
    if (!person) throw invalidInput({ [field]: 'No such person.' });
    return { id: String(person._id), name: person.name };
  }
}
