import { IsMongoId, IsString, MaxLength } from 'class-validator';

/** Shape check only; the domain rules (address format, byte size, readable content) live in SitesService.create. */
export class CreateSiteDto {
  @IsString()
  @MaxLength(200)
  address: string;

  @IsString()
  @MaxLength(500)
  title: string;

  @IsMongoId({ message: 'Choose who is publishing.' })
  authorId: string;

  @IsString()
  @MaxLength(200_000)
  html: string;
}
