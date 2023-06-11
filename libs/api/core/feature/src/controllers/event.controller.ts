import { EventService } from '@event-participation-trends/api/event/feature';
import {
    ICreateEventRequest,
    ICreateEventResponse,
    IGetAllEventsRequest,
    IGetAllEventsResponse,
    IGetManagedEventsRequest,
    IGetManagedEventsResponse,
} from '@event-participation-trends/api/event/util';
import { Body, Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
//import error
//import { JwtGuard } from '@event-participation-trends/api/guards';

@Controller('event')
export class EventController {
    constructor(private eventService: EventService){}

    @Post('createEvent')
    async createEvent(
        @Body() request: ICreateEventRequest,
    ): Promise<ICreateEventResponse> {
        return this.eventService.createEvent(request);
    }

    /*
    @Get('getAllEvents')
    @UseGuards(JwtGuard)
    async getAllEvents(
        @Req() req: Request 
    ): Promise<IGetAllEventsResponse> {
        const extractRequest: IGetAllEventsRequest = {
            AdminEmail: <string>req.query['AdminEmail']
        }
        return this.eventService.getAllEvent(extractRequest);
    }
    */

    @Post('getManagedEvents')
    async getManagedEvents(
        @Body() request: IGetManagedEventsRequest,
    ): Promise<IGetManagedEventsResponse> {
        return this.eventService.getManagedEvents(request);
    }
    
}