import {
    ICreateEventRequest,
    ICreateEventResponse,
    CreateEventCommand,
    IGetAllEventsRequest,
    IGetAllEventsResponse,
    GetAllEventsQuery,
    IGetManagedEventsRequest,
    IGetManagedEventsResponse,
    GetManagedEventsQuery,
    ISendViewRequestRequest,
    ISendViewRequestResponse,
    SendViewRequestCommand,
    IGetAllViewRequestsRequest,
    IGetAllViewRequestsResponse,
    GetAllViewRequestsQuery,
    IDeclineViewRequestRequest,
    IDeclineViewRequestResponse,
    DeclineViewRequestCommand,
    IAcceptViewRequestRequest,
    IAcceptViewRequestResponse,
    AcceptViewRequestCommand,
    IGetUserViewingEventsRequest,
    IGetUserViewingEventsResponse,
    GetUserViewingEventsQuery,
    IRemoveViewerRequest,
    IRemoveViewerResponse,
    RemoveViewerFromEventCommand,
    IUpdateEventDetailsRequest,
    IUpdateEventDetailsResponse,
    UpdateEventDetailsCommand,
    IGetEventRequest,
    IGetEventResponse,
    GetEventQuery,
    IUpdateFloorlayoutRequest,
    IUpdateFloorlayoutResponse,
    UpdateFloorlayoutCommand,
    IGetEventFloorlayoutRequest,
    IGetEventFloorlayoutResponse,
    GetEventFloorlayoutQuery,
    IAddDevicePositionRequest,
    IAddDevicePositionResponse,
    AddDevicePositionCommand,
    IAddViewerRequest,
    IAddViewerResponse,
    AddViewerCommand,
    IGetEventDevicePositionRequest,
    IGetEventDevicePositionResponse,
    GetEventDevicePositionQuery,
    IGetAllEventCategoriesResponse,
    GetAllEventCategoriesQuery,
    IGetManagedEventCategoriesRequest,
    GetManagedEventCategoriesQuery,
    IGetManagedEventCategoriesResponse,
    IGetFloorplanBoundariesRequest,
    GetFloorplanBoundariesQuery,
    IGetFloorplanBoundariesResponse,
    DeleteEventCommand,
    IDeleteEventRequest,
    IDeleteEventResponse,
    GetAllActiveEventsQuery,
    IGetAllActiveEventsResponse,
    IImageUploadRequest,
    UploadImageCommand,
    IImageUploadResponse,
    IGetEventFloorlayoutImageRequest,
    GetEventFloorlayoutImageQuery,
    IDeleteEventImageRequest,
    DeleteEventImageCommand,
    IDeleteEventImageResponse,
    IGetEventStatisticsRequest,
    GetEventStatisticsQuery,
    IUpdateEventFloorLayoutImgRequest,
    UpdateEventFloorLayoutImgCommand,
    IUpdateEventFloorLayoutImgResponse,
    IGetEventStatisticsResponse,
    IGetEventFloorlayoutImageResponse,
} from '@event-participation-trends/api/event/util';
import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

@Injectable()
export class EventService {
    constructor(
        private readonly commandBus: CommandBus, 
        private readonly queryBus: QueryBus
    ) {}

    async createEvent(request: ICreateEventRequest) {
        return await this.commandBus.execute<CreateEventCommand, ICreateEventResponse>(new CreateEventCommand(request));
    }

    async getAllEvent(request: IGetAllEventsRequest) {
        return await this.queryBus.execute<GetAllEventsQuery, IGetAllEventsResponse>(new GetAllEventsQuery(request));
    }

    async getManagedEvents(request: IGetManagedEventsRequest) {
        return await this.queryBus.execute<GetManagedEventsQuery, IGetManagedEventsResponse>(new GetManagedEventsQuery(request));
    }
    
    async sendViewRequest(request: ISendViewRequestRequest) {
        return await this.commandBus.execute<SendViewRequestCommand, ISendViewRequestResponse>(new SendViewRequestCommand(request));
    }

    async getAllViewRequests(request: IGetAllViewRequestsRequest) {
        return await this.queryBus.execute<GetAllViewRequestsQuery, IGetAllViewRequestsResponse>(new GetAllViewRequestsQuery(request));
    }
    
    async declineViewRequest(request: IDeclineViewRequestRequest) {
        return await this.commandBus.execute<DeclineViewRequestCommand, IDeclineViewRequestResponse>(new DeclineViewRequestCommand(request));
    }

    async acceptViewRequest(request: IAcceptViewRequestRequest) {
        return await this.commandBus.execute<AcceptViewRequestCommand, IAcceptViewRequestResponse>(new AcceptViewRequestCommand(request));
    }

    async getUserViewingEvents(request: IGetUserViewingEventsRequest) {
        return await this.queryBus.execute<GetUserViewingEventsQuery, IGetUserViewingEventsResponse>(new GetUserViewingEventsQuery(request));
    }

    async removeViewerFromEvent(request: IRemoveViewerRequest) {
        return await this.commandBus.execute<RemoveViewerFromEventCommand, IRemoveViewerResponse>(new RemoveViewerFromEventCommand(request));
    }

    async updateEventDetails(request: IUpdateEventDetailsRequest){
        return await this.commandBus.execute<UpdateEventDetailsCommand, IUpdateEventDetailsResponse>(new UpdateEventDetailsCommand(request));
    }

    async getEvent(request: IGetEventRequest) {
        return await this.queryBus.execute<GetEventQuery, IGetEventResponse>(new GetEventQuery(request));
    }

    async getFloorplanBoundaries(request: IGetFloorplanBoundariesRequest) {
        return await this.queryBus.execute<GetFloorplanBoundariesQuery, IGetFloorplanBoundariesResponse>(new GetFloorplanBoundariesQuery(request));
    }

    // Stalls
    async getAllEventStalls(request: IGetEventRequest) {
        return await this.queryBus.execute<GetEventQuery, IGetEventResponse>(new GetEventQuery(request));
    }

    async getEventStall(request: IGetEventRequest) {
        return await this.queryBus.execute<GetEventQuery, IGetEventResponse>(new GetEventQuery(request));
    }

    async createEventStall(request: IGetEventRequest) {
        return await this.queryBus.execute<GetEventQuery, IGetEventResponse>(new GetEventQuery(request));
    }

    async updateEventStall(request: IGetEventRequest) {
        return await this.queryBus.execute<GetEventQuery, IGetEventResponse>(new GetEventQuery(request));
    }
    async updateEventFloorLayout(request: IUpdateFloorlayoutRequest){
        return await this.commandBus.execute<UpdateFloorlayoutCommand, IUpdateFloorlayoutResponse>(new UpdateFloorlayoutCommand(request));
    }

    async getEventFloorLayout(request: IGetEventFloorlayoutRequest) {
        return await this.queryBus.execute<GetEventFloorlayoutQuery, IGetEventFloorlayoutResponse>(new GetEventFloorlayoutQuery(request));
    }

    async addDevicePosition(request: IAddDevicePositionRequest){
        return await this.commandBus.execute<AddDevicePositionCommand, IAddDevicePositionResponse>(new AddDevicePositionCommand(request));
    }

    async addEventViewer(request: IAddViewerRequest){
        return await this.commandBus.execute<AddViewerCommand, IAddViewerResponse>(new AddViewerCommand(request));
    }

    async getEventDevicePosition(request: IGetEventDevicePositionRequest) {
        return await this.queryBus.execute<GetEventDevicePositionQuery, IGetEventDevicePositionResponse>(new GetEventDevicePositionQuery(request));
    }

    async getAllActiveEvents() {
        return await this.queryBus.execute<GetAllActiveEventsQuery, IGetAllActiveEventsResponse>(new GetAllActiveEventsQuery());
    }

    async getAllEventCategories() {
        return await this.queryBus.execute<GetAllEventCategoriesQuery, IGetAllEventCategoriesResponse>(new GetAllEventCategoriesQuery());
    }

    async getManagedEventCategories(request: IGetManagedEventCategoriesRequest) {
        return await this.queryBus.execute<GetManagedEventCategoriesQuery, IGetManagedEventCategoriesResponse>(new GetManagedEventCategoriesQuery(request));
    }

    async deleteEvent(request: IDeleteEventRequest) {
        return await this.commandBus.execute<DeleteEventCommand, IDeleteEventResponse>(new DeleteEventCommand(request));
    }

    async uploadImage(request: IImageUploadRequest) {
        return await this.commandBus.execute<UploadImageCommand, IImageUploadResponse>(new UploadImageCommand(request));
    }

    async getEventFloorLayoutImage(request: IGetEventFloorlayoutImageRequest) {
        return await this.queryBus.execute<GetEventFloorlayoutImageQuery, IGetEventFloorlayoutImageResponse>(new GetEventFloorlayoutImageQuery(request));
    }

    async deleteImage(request: IDeleteEventImageRequest) {
        return await this.commandBus.execute<DeleteEventImageCommand, IDeleteEventImageResponse>(new DeleteEventImageCommand(request));
    }

    async getEventStatistics(request: IGetEventStatisticsRequest) {
        return await this.queryBus.execute<GetEventStatisticsQuery, IGetEventStatisticsResponse>(new GetEventStatisticsQuery(request));
    }

    async updateEventFloorLayoutImage(request: IUpdateEventFloorLayoutImgRequest) {
        return await this.commandBus.execute<UpdateEventFloorLayoutImgCommand, IUpdateEventFloorLayoutImgResponse>(new UpdateEventFloorLayoutImgCommand(request));
    }
}