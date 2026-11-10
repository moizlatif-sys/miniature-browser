import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoUri } from './config';
import { HealthController } from './health.controller';
import { PeopleModule } from './people/people.module';
import { SitesModule } from './sites/sites.module';
import { VisitsModule } from './visits/visits.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: mongoUri(),
        serverSelectionTimeoutMS: 3000,
      }),
    }),
    PeopleModule,
    SitesModule,
    VisitsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
