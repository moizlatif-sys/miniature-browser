import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller';
import { PeopleModule } from './people/people.module';
import { SitesModule } from './sites/sites.module';
import { VisitsModule } from './visits/visits.module';

export const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/miniature-browser';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI ?? DEFAULT_MONGODB_URI,
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
