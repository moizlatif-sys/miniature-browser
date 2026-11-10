import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ListVisitsQuery, RecordVisitDto } from './visit.dto';
import { VisitsService } from './visits.service';

@Controller()
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Post('visits')
  record(@Body() dto: RecordVisitDto) {
    return this.visits.record(dto);
  }

  @Get('people/:personId/visits')
  list(@Param('personId') personId: string, @Query() query: ListVisitsQuery) {
    return this.visits.listForPerson(personId, query.cursor, query.limit);
  }
}
