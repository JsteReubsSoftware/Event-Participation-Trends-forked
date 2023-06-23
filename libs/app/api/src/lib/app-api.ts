import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  IGetUserRoleResponse,
  IGetUsersResponse,
  IUpdateRoleRequest,
  IUser,
  IupdateRoleResponse,
  Role,
} from '@event-participation-trends/api/user/util';
import {
  IAcceptViewRequestRequest,
  IAcceptViewRequestResponse,
  ICreateEventResponse,
  IDeclineViewRequestRequest,
  IDeclineViewRequestResponse,
  IEvent,
  IEventDetails,
  IEventId,
  IGetAllEventsResponse,
  IGetManagedEventsResponse,
  ISendViewRequestResponse,
} from '@event-participation-trends/api/event/util';
import { firstValueFrom } from 'rxjs';
import { Status } from '@event-participation-trends/api/user/util';
import { CookieService } from 'ngx-cookie-service';

interface IGetRequestsUsersResponse {
  Requesters: IUser[];
}

interface IGetRequestsResponse {
  users: IGetRequestsUsersResponse[];
}

@Injectable({
  providedIn: 'root',
})
export class AppApiService {
  constructor(private http: HttpClient, private cookieService: CookieService) {}

  // USERS //
  async getAllUsers(): Promise<IUser[]> {
    return firstValueFrom(
      this.http.get<IGetUsersResponse>('/api/user/getAllUsers', {
        headers: {
          'x-csrf-token': this.cookieService.get('csrf'),
        },
      })
    ).then((response) => {
      return response.users;
    });
  }

  async updateUserRole(user: IUpdateRoleRequest): Promise<Status> {
    return firstValueFrom(
      this.http.post<IupdateRoleResponse>('/api/user/updateUserRole', user, {
        headers: {
          'x-csrf-token': this.cookieService.get('csrf'),
        },
      })
    ).then((response) => {
      return response.status;
    });
  }

  async getRole(): Promise<IGetUserRoleResponse> {
    return firstValueFrom(
      this.http.get<IGetUserRoleResponse>('/api/user/getRole', {
        headers: {
          'x-csrf-token': this.cookieService.get('csrf'),
        },
      })
    ).then((response) => {
      console.log('response', response);
      return response;
    });
  }

  // EVENTS //
  async createEvent(event: IEventDetails): Promise<Status | null | undefined> {
    return firstValueFrom(
      this.http.post<ICreateEventResponse>('/api/event/createEvent', event, {
        headers: {
          'x-csrf-token': this.cookieService.get('csrf'),
        },
      })
    ).then((response) => {
      return response.status;
    });
  }

  async getAllEvents(): Promise<IEvent[]> {
    return firstValueFrom(
      this.http.get<IGetAllEventsResponse>('/api/event/getAllEvents', {
        headers: {
          'x-csrf-token': this.cookieService.get('csrf'),
        },
      })
    ).then((response) => {
      return response.events;
    });
  }

  async getManagedEvents(): Promise<IEvent[]> {
    return firstValueFrom(
      this.http.get<IGetManagedEventsResponse>('/api/event/getManagedEvents', {
        headers: {
          'x-csrf-token': this.cookieService.get('csrf'),
        },
      })
    ).then((response) => {
      return response.events;
    });
  }

  async sendViewRequest(eventId: IEventId): Promise<Status | null | undefined> {
    return firstValueFrom(
      this.http.post<ISendViewRequestResponse>(
        '/api/event/sendViewRequest',
        eventId,
        {
          headers: {
            'x-csrf-token': this.cookieService.get('csrf'),
          },
        }
      )
    ).then((response) => {
      return response.status;
    });
  }

  // REQUESTS //

  async getAccessRequests(eventId: IEventId): Promise<IUser[]> {
    const url = `/api/event/getAllViewRequests?eventId=${eventId.eventId}`;

    return firstValueFrom(
      this.http.get<IGetRequestsResponse>(url, {
        headers: {
          'x-csrf-token': this.cookieService.get('csrf'),
        },
      })
    ).then((response) => {
      return response.users[0].Requesters;
    });
  }

  async acceptAccessRequest(
    request: IAcceptViewRequestRequest
  ): Promise<Status | null | undefined> {
    return firstValueFrom(
      this.http.post<IAcceptViewRequestResponse>(
        '/api/event/acceptViewRequest',
        request,
        {
          headers: {
            'x-csrf-token': this.cookieService.get('csrf'),
          },
        }
      )
    ).then((response) => {
      return response.status;
    });
  }

  async declineAccessRequest(
    request: IDeclineViewRequestRequest
  ): Promise<Status | null | undefined> {
    return firstValueFrom(
      this.http.post<IDeclineViewRequestResponse>(
        '/api/event/declineViewRequest',
        request,
        {
          headers: {
            'x-csrf-token': this.cookieService.get('csrf'),
          },
        }
      )
    ).then((response) => {
      return response.status;
    });
  }
}
