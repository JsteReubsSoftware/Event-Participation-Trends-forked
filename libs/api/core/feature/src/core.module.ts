import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserController } from '../src/controllers/user.controller';
import { EventController } from '../src/controllers/event.controller';
import { GlobalController } from '../src/controllers/global.controller';
import {
  EventService,
  EventModule,
} from '@event-participation-trends/api/event/feature';
import {
  UserModule,
  UserService,
} from '@event-participation-trends/api/user/feature';
import {
  GlobalModule,
  GlobalService,
} from '@event-participation-trends/api/global/feature';
import {
    EmailModule,
    EmailService,
  } from '@event-participation-trends/api/email/feature';
import { ApiGuardsModule } from '@event-participation-trends/api/guards';
import { SensorlinkingModule } from '@event-participation-trends/api/sensorlinking';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    CqrsModule,
    UserModule,
    EventModule,
    GlobalModule,
    EmailModule,
    ApiGuardsModule,
    SensorlinkingModule,
  ],
  controllers: [UserController, EventController, GlobalController],
  providers: [UserService, EventService, GlobalService, JwtService, EmailService],
  exports: [UserService, EventService, GlobalService, EmailService],
})
export class CoreModule {}
