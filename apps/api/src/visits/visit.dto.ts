import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { VISIT_METHODS, VisitMethod } from './visit.schema';

export class RecordVisitDto {
  @IsUUID('4', { message: 'Must be a UUID.' })
  eventId: string;

  @IsMongoId({ message: 'Must be a valid id.' })
  personId: string;

  @IsString()
  @MaxLength(80)
  address: string;

  @IsIn(VISIT_METHODS, { message: 'Must be one of: ' + VISIT_METHODS.join(', ') + '.' })
  method: VisitMethod;

  @IsString()
  @MaxLength(64)
  navigationEntryId: string;
}

export class ListVisitsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
