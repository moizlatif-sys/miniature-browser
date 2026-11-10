import { Controller, Get, Param } from '@nestjs/common';
import { SitesService } from './sites.service';

@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get(':address')
  get(@Param('address') address: string) {
    return this.sites.getByAddress(address);
  }
}
