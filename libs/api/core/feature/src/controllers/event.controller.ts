import { EventService } from '@event-participation-trends/api/event/feature';
import {
    ICreateEventRequest,
    ICreateEventResponse,
    IGetAllEventsRequest,
    IGetAllEventsResponse,
    IGetManagedEventsRequest,
    IGetManagedEventsResponse,
    ISendViewRequestRequest,
    ISendViewRequestResponse,
    IGetAllViewRequestsRequest,
    IGetAllViewRequestsResponse,
    IDeclineViewRequestRequest,
    IDeclineViewRequestResponse,
    IAcceptViewRequestRequest,
    IAcceptViewRequestResponse,
    IGetUserViewingEventsRequest,
    IGetUserViewingEventsResponse,
} from '@event-participation-trends/api/event/util';
import { Body, Controller, Post, Get, UseGuards, Req, Query, SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { IEventDetails, IEventId } from '@event-participation-trends/api/event/util';
import { JwtGuard, RbacGuard } from '@event-participation-trends/api/guards';
import { Role } from '@event-participation-trends/api/user/util';


@Controller('event')
export class EventController {
    constructor(private eventService: EventService){}

    @Post('createEvent')
    @SetMetadata('role',Role.MANAGER)
    @UseGuards(JwtGuard, RbacGuard)
    async createEvent(
        @Req() req: Request,
        @Body() requestBody: IEventDetails,
    ): Promise<ICreateEventResponse> {
        const request: any =req;
        const extractRequest: ICreateEventRequest = {
            ManagerEmail: request.user['email'],
            Event: requestBody,
        }
        return this.eventService.createEvent(extractRequest);
    }

    @Get('getAllEvents')
    @SetMetadata('role',Role.VIEWER)
    @UseGuards(JwtGuard, RbacGuard)
    async getAllEvents(
        @Req() req: Request 
    ): Promise<IGetAllEventsResponse> {
        const request: any =req;
        const extractRequest: IGetAllEventsRequest = {
            AdminEmail: request.user["email"],
        }
        return this.eventService.getAllEvent(extractRequest);
    }

    @Get('getManagedEvents')
    @SetMetadata('role',Role.MANAGER)
    @UseGuards(JwtGuard, RbacGuard)
    async getManagedEvents(
        @Req() req: Request
    ): Promise<IGetManagedEventsResponse> {
        const request: any =req;
        const extractRequest: IGetManagedEventsRequest = {
            ManagerEmail: request.user["email"],
        }
        return this.eventService.getManagedEvents(extractRequest);
    }

    @Post('sendViewRequest')
    @SetMetadata('role',Role.VIEWER)
    @UseGuards(JwtGuard, RbacGuard)
    async sendViewRequest(
        @Req() req: Request,
        @Body() requestBody: IEventId,
    ): Promise<ISendViewRequestResponse> {
        const request: any =req;
        const extractRequest: ISendViewRequestRequest = {
            UserEmail: request.user["email"],
            eventId: requestBody.eventId,
        }
        return this.eventService.sendViewRequest(extractRequest);
    }

    @Get('getAllViewRequests')
    @SetMetadata('role',Role.MANAGER)
    @UseGuards(JwtGuard, RbacGuard)
    async getAllViewRequests(
        @Req() req: Request,
        @Query() query: any
    ): Promise<IGetAllViewRequestsResponse> {
        const request: any =req;
        const extractRequest: IGetAllViewRequestsRequest = {
            managerEmail: request.user["email"],
            eventId: query.eventId,
        }
        return this.eventService.getAllViewRequests(extractRequest);
    }

    @Post('declineViewRequest')
    @SetMetadata('role',Role.MANAGER)
    @UseGuards(JwtGuard, RbacGuard)
    async declineViewRequest(
        @Body() requestBody: IDeclineViewRequestRequest,
    ): Promise<IDeclineViewRequestResponse> {
        const extractRequest: IDeclineViewRequestRequest = {
            userEmail: requestBody.userEmail,
            eventId: requestBody.eventId,
        }
        return this.eventService.declineViewRequest(extractRequest);
    }
    
    @Post('acceptViewRequest')
    @SetMetadata('role',Role.MANAGER)
    @UseGuards(JwtGuard, RbacGuard)
    async acceptViewRequest(
        @Body() requestBody: IAcceptViewRequestRequest,
    ): Promise<IAcceptViewRequestResponse> {
        const extractRequest: IAcceptViewRequestRequest = {
            userEmail: requestBody.userEmail,
            eventId: requestBody.eventId,
        }
        return this.eventService.acceptViewRequest(extractRequest);
    }

    @Get('getAllViewingEvents')
    @SetMetadata('role',Role.VIEWER)
    @UseGuards(JwtGuard, RbacGuard)
    async getAllViewingEvents(
        @Req() req: Request,
        @Query() query: any
    ): Promise<IGetUserViewingEventsResponse> {
        const request: any =req;
        const extractRequest: IGetUserViewingEventsRequest = {
            userEmail: request.user["email"],
        }
        return this.eventService.getUserViewingEvenst(extractRequest);
    }

}