import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateSiteDto } from './create-site.dto';
import { SitesService } from './sites.service';

@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get(':address')
  get(@Param('address') address: string) {
    return this.sites.getByAddress(address);
  }

  @Post()
  create(@Body() dto: CreateSiteDto) {
    return this.sites.create(dto);
  }
}
