import {
  UserModule,
  UserService,
} from '@event-participation-trends/api/user/feature';
import { UserController } from '../src/controllers/user.controller';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EventController } from '../src/controllers/event.controller';
import {
  EventService,
  EventModule,
} from '@event-participation-trends/api/event/feature';
import { GuardsModule } from '@event-participation-trends/guards';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    CqrsModule,
    UserModule,
    EventModule,
    GuardsModule,
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [UserController, EventController],
  providers: [UserService, EventService],
  exports: [UserService, EventService],
})
export class CoreModule {}
