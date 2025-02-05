import {Test} from '@nestjs/testing';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { AppModule } from '../../../../apps/api/src/app/app.module';
import { Types } from 'mongoose';
import request from 'supertest';
import { CsrfGuard, JwtGuard, RbacGuard } from '@event-participation-trends/api/guards';
import { EventRepository } from '@event-participation-trends/api/event/data-access';
import { UserRepository } from '@event-participation-trends/api/user/data-access';
import { GlobalRepository } from '@event-participation-trends/api/global/data-access';
import { ICreateEventRequest, IEvent, IFloorLayout, IImageUploadRequest, IPosition, IUpdateEventFloorLayoutImgRequest, IViewEvent, Position } from '@event-participation-trends/api/event/util';
import { IUser, Role } from '@event-participation-trends/api/user/util';
import { ICreateGlobalRequest, IGlobal } from '@event-participation-trends/api/global/util';
import { promisify } from 'util';
import { UpdateEventDetails } from '@event-participation-trends/api/event/feature';
import { Image } from "@event-participation-trends/api/event/feature";


//constants 
// eslint-disable-next-line prefer-const
let TEST_EVENT: IEvent ={
    StartDate: new Date("2023-06-10T12:34:56.789Z"),
    EndDate: new Date("2023-06-13T12:34:56.789Z"),
    Name: "Testing Event",
    Category: "Testing Category",
    Location: "Event Location",
    Manager: new Types.ObjectId(),
    FloorLayout: null,
   // Devices: Array<Position>(),
}

// eslint-disable-next-line prefer-const
let TEST_EVENT_2: IEvent ={
    StartDate: new Date("2023-06-10T12:34:56.789Z"),
    EndDate: new Date("2023-06-13T12:34:56.789Z"),
    Name: "Testing Event 2",
    Category: "Testing Category 2",
    Location: "Event Location 2",
    Manager: new Types.ObjectId(),
    FloorLayout: null,
   // Devices: Array<Position>(),
}

const UPDATED_TEST_EVENT: IEvent ={
    StartDate: new Date("2023-06-10T12:34:56.789Z"),
    EndDate: new Date("2023-06-13T12:34:56.789Z"),
    Name: "New Testing Event",
    Category: "New Testing Category",
    Location: "Updated Event location"
   // Devices: Array<Position>(),
}

const TEST_USER_1: IUser ={
    Email: process.env['TEST_USER_EMAIL_1'],
	FirstName: "Test Name",
	LastName: "Test Lastname",
	Role: process.env['TEST_USER_ROLE_1'],
    Viewing: new Array<Types.ObjectId>()
}

const TEST_USER_2: IUser ={
    Email: process.env['TEST_USER_EMAIL_2'],
	FirstName: "None",
	LastName: "None",
	Role: process.env['TEST_USER_ROLE_2'],
    Viewing: new Array<Types.ObjectId>()
}

const TEST_DEVICE_POSITION: IPosition ={
    id: 0,
    x: 0,
    y: 0,
    timestamp: new Date()
}

const TEST_GLOBAL: IGlobal ={
    SensorIdToMacs: [{
        eventSensorId: "test01",
        mac: "00:00:00:00:00:00"
    }]
}

const EVENT_IMAGE: IImageUploadRequest ={
    eventId: "",
    imgBase64: "data:image/jpeg;base64,BASE64_STRING",
    imageObj: "{x_cord:10,y_cord:20}",
    imageScale: 5,
    imageType: "jpeg"
}

const UPDATED_EVENT_IMAGE: IUpdateEventFloorLayoutImgRequest ={
    eventId: "",
    imageId: "",
    managerEmail: "",
    imgBase64: "data:image/png;base64,UPDATED_BASE64_STRING",
    imageObj: "{x_cord:15,y_cord:25}",
    imageScale: 10,
    imageType: "png"
}

const SLEEP = promisify(setTimeout);

//helper functions
function objectSubset(target: any, obj: any ): boolean{
		
	for(const element of obj){
		for (const key in target){
			// eslint-disable-next-line no-prototype-builtins
			if (target.hasOwnProperty(key)){
                // eslint-disable-next-line no-prototype-builtins
				if(key in target && key in element){
					if( element.key != target.key){
						return false;
                    }
                }else{
                    return false;
                }
			}
				
		}
	}
	
	return true;
}

describe('GlobalController', ()=>{
    let moduleRef: any;
    let httpServer: any;
    let app: any;
    let globalRepository: GlobalRepository;

    beforeAll(async ()=>{
        process.env['ENVIRONMENT'] = "test";  

        moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        })
        .overrideGuard(JwtGuard)
        .useValue({ canActivate: (context) => {
            context.switchToHttp().getRequest().user = { email: process.env['TEST_USER_EMAIL_1'] };
            return true;
        } })
        .overrideGuard(RbacGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(CsrfGuard)
        .useValue({ canActivate: () => true })
        .compile();

        app = moduleRef.createNestApplication();
        await app.init();

        httpServer = app.getHttpServer();

        globalRepository = moduleRef.get(GlobalRepository);
    })

    afterAll(async ()=>{
        //process.env['ENVIRONMENT'] = "development";
        await app.close();
    })
    
    describe('getGlobal', ()=>{
        it('Should return an array of eventSensorId and macs pairs', async ()=>{
            await globalRepository.createGlobal(TEST_GLOBAL); 

            const response = await request(httpServer).get("/global/getGlobal?sensorIdToMacs='true'");

            expect(response.status).toBe(200);
            expect(response.body.sensorIdToMacs).toEqual(TEST_GLOBAL.SensorIdToMacs);

            //cleanup
            await globalRepository.deleteGlobal();
        })  
    })

    describe('createGlobal', ()=>{
        it('Should set a global object in the database', async ()=>{
            const expectedRequest: ICreateGlobalRequest ={
                sensorIdToMacs: TEST_GLOBAL.SensorIdToMacs
            };

            const response = await request(httpServer).post("/global/createGlobal").send(expectedRequest);
            expect(response.body.status).toEqual("success");

            //due to delayed persistance wait
            let global = await globalRepository.getGlobal();
            while(global.length == 0){
                global = await globalRepository.getGlobal();
                await SLEEP(500);
            }

            const res = objectSubset(expectedRequest.sensorIdToMacs[0],[global[0].SensorIdToMacs[0]]);
            expect(res).toBe(true);

            //cleanup
            await globalRepository.deleteGlobal();
        })  
    })

});

describe('EventController', ()=>{
    let moduleRef: any;
    let httpServer: any;
    let app: any;
    let eventRepository: EventRepository;
    let userRepository: UserRepository;

    beforeAll(async ()=>{
        process.env['ENVIRONMENT'] = "test";  

        moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        })
        .overrideGuard(JwtGuard)
        .useValue({ canActivate: (context) => {
            context.switchToHttp().getRequest().user = { email: process.env['TEST_USER_EMAIL_1'] };
            return true;
        } })
        .overrideGuard(RbacGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(CsrfGuard)
        .useValue({ canActivate: () => true })
        .compile();

        app = moduleRef.createNestApplication();
        await app.init();

        httpServer = app.getHttpServer();

        eventRepository = moduleRef.get(EventRepository);
        userRepository = moduleRef.get(UserRepository);
    })

    afterAll(async ()=>{
        //process.env['ENVIRONMENT'] = "development";
        await app.close();
    })

    describe('getEvent', ()=>{
        it('Should return an event object', async ()=>{
            await eventRepository.createEvent(TEST_EVENT); 
            const event = await eventRepository.getEventByName(TEST_EVENT.Name);

            const response = await request(httpServer).get(`/event/getEvent?eventId=${event[0]._id}`);

            expect(response.status).toBe(200);
            const res = objectSubset(TEST_EVENT,[response.body.event]);
            expect(res).toBe(true);

            //cleanup
            await eventRepository.deleteEventbyId(event[0]._id)
        })  
    })
   
    describe('getAllEvents',  ()=>{
        it('Should return an array of events', async ()=>{
            await eventRepository.createEvent(TEST_EVENT); 
            const event = await eventRepository.getEventByName(TEST_EVENT.Name);

            const response = await request(httpServer).get('/event/getAllEvents');

            expect(response.status).toBe(200);
            const res = objectSubset(TEST_EVENT,response.body.events);
            expect(res).toBe(true);

            //cleanup
            await eventRepository.deleteEventbyId(event[0]._id)
        })  
    })
 
    describe('getManagedEvents',  ()=>{
        it('Should return an array of events', async ()=>{
            await userRepository.createUser(TEST_USER_1);
            
            const user = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = user[0]._id;
            
            await eventRepository.createEvent(TEST_EVENT);
            const event = await eventRepository.getEventByName(TEST_EVENT.Name);

            const response = await request(httpServer).get('/event/getManagedEvents');

            expect(response.status).toBe(200);
            const res = objectSubset(TEST_EVENT,response.body.events);
            expect(res).toBe(true);

            //cleanup
            await userRepository.deleteUserById(user[0]._id);
            await eventRepository.deleteEventbyId(event[0]._id);
        })
    })

    describe('getAllViewRequests',  ()=>{
        it('Should return an array of Requesters', async ()=>{
            //create event manager and event
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = manager[0]._id;

            await eventRepository.createEvent(TEST_EVENT); 
            const event = await eventRepository.getEventByName(TEST_EVENT.Name);

            //create event viewer
            await userRepository.createUser(TEST_USER_2);
            const viewer = await userRepository.getUser(process.env['TEST_USER_EMAIL_2']);

            await eventRepository.createViewRequest(viewer[0]._id,event[0]._id);
            
            //test endpoint
            const response = await request(httpServer).get(`/event/getAllViewRequests?eventId=${event[0]._id}`);            

            expect(response.status).toBe(200);
            const res = objectSubset(TEST_USER_2,response.body.users[0].Requesters);
            expect(res).toBe(true);

            //cleanup
            await userRepository.deleteUserById(manager[0]._id);
            await userRepository.deleteUserById(viewer[0]._id);
            await eventRepository.deleteEventbyId(event[0]._id);
        })
    })

    describe('getAllViewingEvents',  ()=>{
        it('Should return an array of events', async ()=>{

            const moduleRef = await Test.createTestingModule({
                imports: [AppModule],
            })
            .overrideGuard(JwtGuard)
            .useValue({
            canActivate: (context) => {
                context.switchToHttp().getRequest().user = {
                email: process.env['TEST_USER_EMAIL_2'],
                };
                return true;
            },
            })
            .overrideGuard(RbacGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(CsrfGuard)
            .useValue({ canActivate: () => true })
            .compile();

            // Get the NestJS application instance and HTTP server
            const app = moduleRef.createNestApplication();
            await app.init();
            const httpServer = app.getHttpServer();

            //create manager
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = manager[0]._id;
    
            //create event
            await eventRepository.createEvent(TEST_EVENT);
            const event = await eventRepository.getEventByName(TEST_EVENT.Name);
    
            //create viewer
            await userRepository.createUser(TEST_USER_2);
            const viewer = await userRepository.getUser(process.env['TEST_USER_EMAIL_2']);
            
            await userRepository.addViewingEvent(viewer[0]._id, event[0]._id);
    
            const response = await request(httpServer).get('/event/getAllViewingEvents');
    
            expect(response.status).toBe(200);
            const res = objectSubset(TEST_EVENT,response.body.events);
            expect(res).toBe(true);
    
            //cleanup
            await userRepository.deleteUserById(viewer[0]._id);
            await userRepository.deleteUserById(manager[0]._id);
            await eventRepository.deleteEventbyId(event[0]._id);

            await app.close();
        })
    })

    describe('getEventFloorLayout', ()=>{
        it('Should return an string represention of a FloorLayout', async ()=>{
            await eventRepository.createEvent(TEST_EVENT); 
            const event = await eventRepository.getEventByName(TEST_EVENT.Name);

            await eventRepository.updateEventFloorlayout(event[0]._id,"Test Floor Layout");

            const response = await request(httpServer).get(`/event/getEventFloorLayout?eventId=${event[0]._id}`);

            expect(response.status).toBe(200);
            expect(response.body.floorlayout).toEqual("Test Floor Layout");

            //cleanup
            await eventRepository.deleteEventbyId(event[0]._id)
        })  
    })

    describe('getEventDevicePosition', ()=>{
        it('Should return an array of positions', async ()=>{
            await eventRepository.createEvent(TEST_EVENT); 
            const event = await eventRepository.getEventByName(TEST_EVENT.Name);
            await eventRepository.addDevicePosition(event[0]._id, [TEST_DEVICE_POSITION]);

            const startTime = (new Date(TEST_DEVICE_POSITION.timestamp.setHours(TEST_DEVICE_POSITION.timestamp.getHours() -4))).toString();
            const endTime = (new Date(TEST_DEVICE_POSITION.timestamp.setHours(TEST_DEVICE_POSITION.timestamp.getHours() +6))).toString();
            const eventId = <string> <unknown> (event[0]._id);

            const URI='/event/getEventDevicePosition?eventId='+eventId+'&startTime="'+startTime+'"&endTime="'+endTime+'"';

            const response = await request(httpServer).get(URI);

            expect(response.status).toBe(200);
            const res = objectSubset(TEST_DEVICE_POSITION,response.body.positions);
            expect(res).toBe(true);

            //cleanup
            await eventRepository.deleteEventbyId(event[0]._id)
        })  
    })

    describe('getAllEventCategories', ()=>{
        it('Should return an array of categories', async ()=>{
            await eventRepository.createEvent(TEST_EVENT); 
            const event = await eventRepository.getEventByName(TEST_EVENT.Name);

            const response = await request(httpServer).get("/event/getAllEventCategories");

            expect(response.status).toBe(200);
            expect(response.body.categories[0]).toBe(TEST_EVENT.Category);

            //cleanup
            await eventRepository.deleteEventbyId(event[0]._id)
        })  
    })

    describe('createEvent', ()=>{
        it('Should create an event in the Database', async ()=>{
            //create event manager and event
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = manager[0]._id;

            const response = await request(httpServer).post("/event/createEvent").send(TEST_EVENT);
            expect(response.body.status).toEqual("success");

            //due to delayed persistance wait
            let event = await eventRepository.getEventByName(TEST_EVENT.Name);
            while(event.length == 0){
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
                await SLEEP(50);
            }

            //due to async have to unwrap
            const temp: IEvent = {
                StartDate: event[0].StartDate,
                EndDate: event[0].EndDate,
                Name: event[0].Name,
                Category: event[0].Category,
                Location: event[0].Location,
                Manager: event[0].Manager,
                FloorLayout: <IFloorLayout> {JSON_DATA: event[0].FloorLayout},
            }

            const res = objectSubset(TEST_EVENT,[temp]);
            expect(res).toBe(true);

            //cleanup
            await eventRepository.deleteEventbyId(event[0]._id);
            await userRepository.deleteUserById(manager[0]._id);
        })  
    })

    describe('deleteEvent', ()=>{
        it('Should delete an event object', async ()=>{
            //create event manager and event
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = manager[0]._id;
            TEST_EVENT_2.Manager = manager[0]._id;

            //create events
            await eventRepository.createEvent(TEST_EVENT); 
            await eventRepository.createEvent(TEST_EVENT_2); 
            const event1 = await eventRepository.getEventByName(TEST_EVENT.Name);
            const event2 = await eventRepository.getEventByName(TEST_EVENT_2.Name);

            const response = await request(httpServer).post('/event/deleteEvent').send({
                eventId: event2[0]._id
            });

            //event1 should still be present and only event in db
            expect(response.status).toBe(201);
            let events = await eventRepository.getAllEvents();

            while(events.length != 1){
                SLEEP(500);
                events = await eventRepository.getAllEvents();
            }

            if(events && events.length ==1){

                const temp: IEvent = {
                    StartDate: events[0].StartDate,
                    EndDate: events[0].EndDate,
                    Name: events[0].Name,
                    Category: events[0].Category,
                    Location: events[0].Location,
                    Manager: events[0].Manager,
                    FloorLayout: null,
                }
                // eslint-disable-next-line no-prototype-builtins
                const res = objectSubset(TEST_EVENT,[temp]);
                expect(res).toBe(true);
            }else{  //intentionally fail 
                expect(true).toBe(false);
            }

            //cleanup
            await eventRepository.deleteEventbyId(event1[0]._id);
            await eventRepository.deleteEventbyId(event2[0]._id);
            await userRepository.deleteUserById(manager[0]._id);
        })  
    })

    describe('updateEventDetails', ()=>{
        it('Should update an events details', async ()=>{
            await eventRepository.createEvent(TEST_EVENT); 
            let event = await eventRepository.getEventByName(TEST_EVENT.Name);

            const requestObj = {
                eventId: event[0]._id,
                eventDetails: UPDATED_TEST_EVENT,
            }

            const response = await request(httpServer).post("/event/updateEventDetails").send(requestObj);
            expect(response.body.status).toBe("success");
            
            event = await eventRepository.getEventByName(UPDATED_TEST_EVENT.Name);
            while(event.length == 0){
                event = await eventRepository.getEventByName(UPDATED_TEST_EVENT.Name);
                SLEEP(50);
            }

            const temp: IEvent = {
                StartDate: event[0].StartDate,
                EndDate: event[0].EndDate,
                Name: event[0].Name,
                Category: event[0].Category,
                Location: event[0].Location,
            }

            const res = objectSubset(UPDATED_TEST_EVENT,[temp]);
            expect(res).toBe(true);

            //cleanup
            await eventRepository.deleteEventbyId(event[0]._id)
        })  
    })

    describe('updateEventFloorlayout', ()=>{
        it('Should update an events floor layout', async ()=>{
            await userRepository.createUser(TEST_USER_1);
            const user = await userRepository.getUser(TEST_USER_1.Email);
            
            TEST_EVENT.Manager = user[0]._id;
            await eventRepository.createEvent(TEST_EVENT); 
            let event = await eventRepository.getEventByName(TEST_EVENT.Name);
            await eventRepository.updateEventFloorlayout(event[0]._id,"Current Floor Layout");

            const requestObj = {
                eventId: event[0]._id,
                floorlayout: "New FloorLayout",
            }

            const response = await request(httpServer).post("/event/updateEventFloorlayout").send(requestObj);
            expect(response.body.status).toBe("success");
            
            event = await eventRepository.getEventByName(TEST_EVENT.Name);
            
            if(event[0].FloorLayout != "New FloorLayout"){
                await SLEEP(1000);
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
            }

            expect(event[0].FloorLayout).toBe("New FloorLayout");

            //cleanup
            await eventRepository.deleteEventbyId(event[0]._id)
            await userRepository.deleteUserById(user[0]._id);
        })  
    })

    describe('sendViewRequest',  ()=>{
        it('Should send a view request', async ()=>{
            
            const moduleRef = await Test.createTestingModule({
                imports: [AppModule],
            })
            .overrideGuard(JwtGuard)
            .useValue({
                canActivate: (context) => {
                context.switchToHttp().getRequest().user = {
                email: process.env['TEST_USER_EMAIL_2'],
                };
                return true;
            },
            })
            .overrideGuard(RbacGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(CsrfGuard)
            .useValue({ canActivate: () => true })
            .compile();

            // Get the NestJS application instance and HTTP server
            const app = moduleRef.createNestApplication();
            await app.init();
            const httpServer = app.getHttpServer();

            //create event manager
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = manager[0]._id;
            TEST_EVENT.Requesters = new Array<Types.ObjectId>();

            //create event viewer
            await userRepository.createUser(TEST_USER_2);
            const viewer = await userRepository.getUser(process.env['TEST_USER_EMAIL_2']);

            //create event
            await eventRepository.createEvent(TEST_EVENT); 
            let event = await eventRepository.getEventByName(TEST_EVENT.Name);
            
            //test endpoint
            const response = await request(httpServer).post(`/event/sendViewRequest`).send({
                eventId: <string> <unknown> event[0]._id
            });            
            expect(response.body.status).toBe("success");

            event = await eventRepository.getEventByName(TEST_EVENT.Name);
            if(event[0].Requesters.length == 0){
                SLEEP(1000);
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
            }

            const requesters = await eventRepository.getRequesters(event[0]._id);
            expect(requesters[0].Requesters[0]).toEqual(viewer[0]._id);

            //cleanup
            delete TEST_EVENT.Requesters;
            await userRepository.deleteUserById(manager[0]._id);
            await userRepository.deleteUserById(viewer[0]._id);
            await eventRepository.deleteEventbyId(event[0]._id);

            await app.close();
        })
    })    

    describe('declineViewRequest', ()=>{
        it('should decline a View Request', async ()=>{
                        
            //create event viewer
            await userRepository.createUser(TEST_USER_2);
            const viewer = await userRepository.getUser(process.env['TEST_USER_EMAIL_2']);

            //create event manager
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = manager[0]._id;
            TEST_EVENT.Requesters = new Array<Types.ObjectId>(viewer[0]._id);
            
            await eventRepository.createEvent(TEST_EVENT); 
            let event = await eventRepository.getEventByName(TEST_EVENT.Name);

            expect(event[0].Requesters[0]).toEqual(viewer[0]._id);

            const response = await request(httpServer).post(`/event/declineViewRequest`).send({
                userEmail: TEST_USER_2.Email,
                eventId: <string> <unknown> event[0]._id
            });
            expect(response.body.status).toBe("success");

            event = await eventRepository.getEventByName(TEST_EVENT.Name);
            while(event[0].Requesters.length != 0){
                SLEEP(500);
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
            }

            expect(event[0].Requesters.length).toEqual(0);

            //cleanup
            delete TEST_EVENT.Requesters;
            await eventRepository.deleteEventbyId(event[0]._id);
            await userRepository.deleteUserById(viewer[0]._id);
            await userRepository.deleteUserById(manager[0]._id);
        })  
    })

    describe('acceptViewRequest', ()=>{
        it('should accept a View Request', async ()=>{
                        
            //create event viewer
            await userRepository.createUser(TEST_USER_2);
            let viewer = await userRepository.getUser(TEST_USER_2.Email);

            //create event manager
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(TEST_USER_1.Email);
            TEST_EVENT.Manager = manager[0]._id;
            TEST_EVENT.Requesters = new Array<Types.ObjectId>(viewer[0]._id);
            TEST_EVENT.Viewers = new Array<Types.ObjectId>(manager[0]._id);
            
            await eventRepository.createEvent(TEST_EVENT); 
            let event = await eventRepository.getEventByName(TEST_EVENT.Name);

            expect(event[0].Requesters[0]).toEqual(viewer[0]._id);

            const response = await request(httpServer).post(`/event/acceptViewRequest`).send({
                userEmail: TEST_USER_2.Email,
                eventId: <string> <unknown> event[0]._id
            });
            expect(response.body.status).toBe("success");

            //due to delayed persistance must wait
            event = await eventRepository.getEventByName(TEST_EVENT.Name);
            while(event[0].Requesters.length != 0){
                SLEEP(500);
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
            }

            expect(event[0].Requesters.length).toEqual(0);

            while(event[0].Viewers.length != 2){
                SLEEP(1000);
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
            }

            expect(event[0].Viewers[1]).toEqual(viewer[0]._id);

            while(viewer[0].Viewing.length == 0){
                SLEEP(1000);
                viewer = await userRepository.getUser(TEST_USER_2.Email);
            }

            expect(viewer[0].Viewing[0]).toEqual(event[0]._id);
            
            //cleanup
            delete TEST_EVENT.Requesters;
            delete TEST_EVENT.Viewers;
            await eventRepository.deleteEventbyId(event[0]._id);
            await userRepository.deleteUserById(viewer[0]._id);
            await userRepository.deleteUserById(manager[0]._id);
        
        })  
    })
   
    describe('removeViewerFromEvent', ()=>{
        it('should remove a viewer from an event', async ()=>{
                        
            //create event viewer
            await userRepository.createUser(TEST_USER_2);
            let viewer = await userRepository.getUser(TEST_USER_2.Email);

            //create event manager
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(TEST_USER_1.Email);
            TEST_EVENT.Manager = manager[0]._id;
            TEST_EVENT.Requesters = new Array<Types.ObjectId>(viewer[0]._id);
            TEST_EVENT.Viewers = new Array<Types.ObjectId>(manager[0]._id);
            
            await eventRepository.createEvent(TEST_EVENT); 
            let event = await eventRepository.getEventByName(TEST_EVENT.Name);

            expect(event[0].Requesters[0]).toEqual(viewer[0]._id);

            const response = await request(httpServer).post(`/event/removeViewerFromEvent`).send({
                userEmail: TEST_USER_2.Email,
                eventId: <string> <unknown> event[0]._id
            });
            expect(response.body.status).toBe("success");

            //due to delayed persistance must wait
            event = await eventRepository.getEventByName(TEST_EVENT.Name);
            while(event[0].Viewers.length != 1){
                SLEEP(500);
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
            }

            expect(event[0].Viewers.length).toEqual(1);
            expect(event[0].Viewers[0]).toEqual(manager[0]._id);

            viewer = await userRepository.getUser(TEST_USER_2.Email);
            while(viewer[0].Viewing.length != 0){
                SLEEP(500);
                viewer = await userRepository.getUser(TEST_USER_2.Email);
            }

            expect(viewer[0].Viewing.length).toEqual(0);
            
            //cleanup
            delete TEST_EVENT.Requesters;
            delete TEST_EVENT.Manager;
            delete TEST_EVENT.Viewers;
            await eventRepository.deleteEventbyId(event[0]._id);
            await userRepository.deleteUserById(viewer[0]._id);
            await userRepository.deleteUserById(manager[0]._id);
        
        })  
    })

    describe('getActiveEvents',  ()=>{
        it('Should return an array of events', async ()=>{
            //create event manager and event
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = manager[0]._id;
            TEST_EVENT_2.Manager = manager[0]._id;
            
            //set details to current time
            TEST_EVENT.StartDate = new Date();
            TEST_EVENT.EndDate = new Date();
            TEST_EVENT.EndDate.setHours(TEST_EVENT.EndDate.getHours() + 2);

            //create events 
            await eventRepository.createEvent(TEST_EVENT); 
            await eventRepository.createEvent(TEST_EVENT_2); 
            const event1 = await eventRepository.getEventByName(TEST_EVENT.Name);
            const event2= await eventRepository.getEventByName(TEST_EVENT_2.Name);

            let events = await eventRepository.getAllEvents();
            while(events.length != 2){
                SLEEP(500);
                events = await eventRepository.getAllEvents();
            }
            
            const response = await request(httpServer).get('/event/getAllActiveEvents');

            expect(response.status).toBe(200);
            const res = objectSubset(TEST_EVENT,response.body.events);
            expect(res).toBe(true);

            //cleanup
            await userRepository.deleteUserById(manager[0]._id);
            await eventRepository.deleteEventbyId(event1[0]._id);
            await eventRepository.deleteEventbyId(event2[0]._id);
        })  
    })

    describe('uploadFloorlayoutImage',  ()=>{
        it('Should upload the given image', async ()=>{
            //create event manager and event
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = manager[0]._id;

            //create event
            await eventRepository.createEvent(TEST_EVENT); 
            let event = await eventRepository.getEventByName(TEST_EVENT.Name);
            
            while(event.length != 1){
                SLEEP(500);
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
            }

            EVENT_IMAGE.eventId = <string> <unknown> event[0]._id;

            const response = await request(httpServer).post('/event/uploadFloorlayoutImage').send(
                EVENT_IMAGE
            );
            expect(response.body.status).toBe("success");

            //should create an image 
            let eventImg = await eventRepository.findImageByEventId(event[0]._id);

            while(event.length != 1){
                SLEEP(500);
                eventImg = await eventRepository.findImageByEventId(event[0]._id);
            }

            const temp: IImageUploadRequest = {
                eventId: <string> <unknown> event[0]._id,
                imgBase64: eventImg[0].imageBase64,
                imageObj: eventImg[0].imageObj,
                imageScale: eventImg[0].imageScale,
                imageType: eventImg[0].imageType,
            }

            const res = objectSubset(EVENT_IMAGE,[temp]);
            expect(res).toBe(true);

            //should add imageid to the event's FloorLayoutImgs array
            while(event[0].FloorLayoutImgs.length != 1){
                SLEEP(500);
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
            }

            if(event[0].FloorLayoutImgs[0].equals(eventImg[0]._id)){
                expect(true).toBe(true);
            }else{
                expect(false).toBe(true);
            }

            //cleanup
            await userRepository.deleteUserById(manager[0]._id);
            await eventRepository.deleteEventbyId(event[0]._id);
            await eventRepository.removeImage(eventImg[0]._id);
        })  
    })

    describe('getFloorLayoutImage',  ()=>{
        it('Should return the given image', async ()=>{
            //create event manager and event
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = manager[0]._id;

            //create event
            await eventRepository.createEvent(TEST_EVENT); 
            let event = await eventRepository.getEventByName(TEST_EVENT.Name);
            
            while(event.length != 1){
                SLEEP(500);
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
            }

            EVENT_IMAGE.eventId = <string> <unknown> event[0]._id;

            await eventRepository.uploadImage(new Image(
                <Types.ObjectId> <unknown> EVENT_IMAGE.eventId,
                EVENT_IMAGE.imgBase64,
                EVENT_IMAGE.imageScale,
                EVENT_IMAGE.imageType,
                EVENT_IMAGE.imageObj
            ));

            let eventImg =  await eventRepository.findImagesIdByEventId(event[0]._id);
            while(eventImg.length != 1){
                SLEEP(500);
                eventImg =  await eventRepository.findImagesIdByEventId(event[0]._id);
            }
            
            const response = await request(httpServer).get(`/event/getFloorLayoutImage?eventId=${event[0]._id}`);

            const temp: IImageUploadRequest = {
                eventId: <string> <unknown> response.body.images[0]._id,
                imgBase64: response.body.images[0].imageBase64,
                imageObj: response.body.images[0].imageObj,
                imageScale: response.body.images[0].imageScale,
                imageType: response.body.images[0].imageType,
            }

            expect(response.status).toBe(200);
            const res = objectSubset(EVENT_IMAGE,[temp]);
            expect(res).toBe(true);

            //cleanup
            await userRepository.deleteUserById(manager[0]._id);
            await eventRepository.deleteEventbyId(event[0]._id);
            await eventRepository.removeImage(eventImg[0]._id);
        })  
    })

    describe('updateEventFloorlayoutImage',  ()=>{
        it('Should update the given image', async ()=>{
            //create event manager and event
            await userRepository.createUser(TEST_USER_1);
            const manager = await userRepository.getUser(process.env['TEST_USER_EMAIL_1']);
            TEST_EVENT.Manager = manager[0]._id;

            //create event
            await eventRepository.createEvent(TEST_EVENT); 
            
            let event = await eventRepository.getEventByName(TEST_EVENT.Name);
            while(event.length != 1){
                SLEEP(500);
                event = await eventRepository.getEventByName(TEST_EVENT.Name);
            }

            EVENT_IMAGE.eventId = <string> <unknown> event[0]._id;

            await eventRepository.uploadImage(new Image(
                <Types.ObjectId> <unknown> EVENT_IMAGE.eventId,
                EVENT_IMAGE.imgBase64,
                EVENT_IMAGE.imageScale,
                EVENT_IMAGE.imageType,
                EVENT_IMAGE.imageObj
            ));

            let eventImg = await eventRepository.findImageByEventId(event[0]._id);
            while(eventImg.length != 1){
                SLEEP(500);
                eventImg = await eventRepository.findImageByEventId(event[0]._id);
            }
            
            UPDATED_EVENT_IMAGE.eventId = <string> <unknown> event[0]._id;
            UPDATED_EVENT_IMAGE.imageId = <string> <unknown> eventImg[0]._id;
            UPDATED_EVENT_IMAGE.managerEmail = process.env['TEST_USER_EMAIL_1'];

            await eventRepository.addImageToEvent(event[0]._id,eventImg[0]._id);

            const response = await request(httpServer).post('/event/updateEventFloorlayoutImage').send(
                UPDATED_EVENT_IMAGE
            );

            eventImg = await eventRepository.findImageByEventId(event[0]._id);
            //imageType is last to update ref: event handler
            console.log(eventImg[0].imageType);
            console.log(UPDATED_EVENT_IMAGE.imageType);
            while(eventImg[0].imageType != UPDATED_EVENT_IMAGE.imageType ){  
                SLEEP(500);
                eventImg = await eventRepository.findImageByEventId(event[0]._id);
            }
            
            expect(response.body.status).toBe("success");

            const temp: IUpdateEventFloorLayoutImgRequest = {
                eventId: <string> <unknown> event[0]._id,
                imageId: <string> <unknown> eventImg[0]._id,
                managerEmail: process.env['TEST_USER_EMAIL_1'],
                imgBase64: eventImg[0].imageBase64,
                imageObj: eventImg[0].imageObj,
                imageScale: eventImg[0].imageScale,
                imageType: eventImg[0].imageType,
            }

            const res = objectSubset(UPDATED_EVENT_IMAGE,[temp]);
            expect(res).toBe(true);

            //cleanup
            await userRepository.deleteUserById(manager[0]._id);
            await eventRepository.deleteEventbyId(event[0]._id);
            await eventRepository.removeImage(eventImg[0]._id);
        })  
    })

})

describe('UserController', ()=>{
    let httpServer: any;
    let app: any;
    let userRepository: UserRepository;

    beforeAll(async ()=>{

        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        })
        .overrideGuard(JwtGuard)
        .useValue({ canActivate: (context) => {
            context.switchToHttp().getRequest().user = { email: process.env['ADMIN_EMAIL'] };
            return true;
        } })
        .overrideGuard(RbacGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(CsrfGuard)
        .useValue({ canActivate: () => true })
        .compile();

        app = moduleRef.createNestApplication();
        await app.init();

        httpServer = await app.getHttpServer();

        userRepository = await moduleRef.get(UserRepository);
    })

    afterAll(async ()=>{
        //process.env['ENVIRONMENT'] = "development";
        await app.close();
    })
    
    describe('getAllUsers', ()=>{
        it('Should return an array of Users', async ()=>{
            await userRepository.createUser(TEST_USER_2); 
            const user = await userRepository.getUser(process.env['TEST_USER_EMAIL_2']);

            const response = await request(httpServer).get("/user/getAllUsers");

            expect(response.status).toBe(200);
            const res = objectSubset(TEST_USER_2,response.body.users);
            expect(res).toBe(true);

            //cleanup
            await userRepository.deleteUserById(user[0]._id)
        })  
    })

    describe('updateUserRole', ()=>{
        it('Should update user role', async ()=>{
            
            const moduleRef = await Test.createTestingModule({
                imports: [AppModule],
            })
            .overrideGuard(JwtGuard)
            .useValue({
                canActivate: (context) => {
                context.switchToHttp().getRequest().user = {
                email: process.env['ADMIN_EMAIL'],
                };
                return true;
            },
            })
            .overrideGuard(RbacGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(CsrfGuard)
            .useValue({ canActivate: () => true })
            .compile();

            // Get the NestJS application instance and HTTP server
            const app = moduleRef.createNestApplication();
            await app.init();
            const httpServer = app.getHttpServer();

            await userRepository.createUser(TEST_USER_2); 

            const requestObj= {
                update: {
                    UserEmail: process.env['TEST_USER_EMAIL_2'],
                    UpdateRole: Role.MANAGER,
                }
            }

            const response = await request(httpServer).post("/user/updateUserRole").send(requestObj);
            expect(response.body.status).toEqual("success");

            const user = await userRepository.getUser(process.env['TEST_USER_EMAIL_2']);
            
            //delayed persistence has posiblilty that not immedietly changed in DB hence wait
            if(user[0].Role != Role.MANAGER)
                await SLEEP(1000);

            expect(user[0].Role).toBe(Role.MANAGER);

            //cleanup
            await userRepository.deleteUserById(user[0]._id);
            await app.close();
        })  
    })

});


describe('UserController: jwt tests', ()=>{
    let httpServer: any;
    let app: any;
    let userRepository: UserRepository;

    beforeAll(async ()=>{

        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        })
        .overrideGuard(JwtGuard)
        .useValue({ canActivate: (context) => {
            context.switchToHttp().getRequest().user = {
                email: TEST_USER_2.Email,
                role: TEST_USER_2.Role,
                firstName: TEST_USER_2.FirstName,
                lastName: TEST_USER_2.LastName, 
                picture: "https://test_url"

            };
            return true;
        } })
        .overrideGuard(RbacGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(CsrfGuard)
        .useValue({ canActivate: () => true })
        .compile();

        app = moduleRef.createNestApplication();
        await app.init();

        httpServer = await app.getHttpServer();

        userRepository = await moduleRef.get(UserRepository);
    })

    afterAll(async ()=>{
        //process.env['ENVIRONMENT'] = "development";
        await app.close();
    })

    describe('getRole', ()=>{
        it('Should return a users role', async ()=>{
            const response = await request(httpServer).get("/user/getRole");

            expect(response.body.userRole).toEqual(TEST_USER_2.Role);
        })  
    })

    describe('getUserName', ()=>{
        it('Should return a users Name', async ()=>{
            const response = await request(httpServer).get("/user/getUserName");

            expect(response.body.username).toEqual(TEST_USER_2.FirstName);
        })  
    })

    describe('getProfilePicUrl', ()=>{
        it('Should return a user picture URL', async ()=>{
            const response = await request(httpServer).get("/user/getProfilePicUrl");

            expect(response.body.url).toEqual("https://test_url");
        })  
    })

    describe('getFullName', ()=>{
        it('Should return a users role', async ()=>{
            const response = await request(httpServer).get("/user/getFullName");

            expect(response.body.fullName).toEqual(TEST_USER_2.FirstName +' '+ TEST_USER_2.LastName);
        })  
    })

    describe('getEmail', ()=>{
        it('Should return a users email', async ()=>{
            const response = await request(httpServer).get("/user/getEmail");

            expect(response.body.email).toEqual(TEST_USER_2.Email);
        })  
    })

});