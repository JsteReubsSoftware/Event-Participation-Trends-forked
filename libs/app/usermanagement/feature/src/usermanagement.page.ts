import { Component, ElementRef, ViewChild } from '@angular/core';
import { AppApiService } from '@event-participation-trends/app/api';
import { IUser } from '@event-participation-trends/api/user/util';

@Component({
  selector: 'event-participation-trends-usermanagement',
  templateUrl: './usermanagement.page.html',
  styleUrls: ['./usermanagement.page.css'],
})
export class UsermanagementPage {
  @ViewChild('content-body', { static: true }) contentBody!: ElementRef;

  constructor(
    private containerElement: ElementRef,
    private appApiService: AppApiService
  ) {
    this.appApiService.getAllUsers().then((users) => {
      this.users = users;
    });
    this.appApiService.getAllUsers().then((users) => {
      this.old_users = users;
    });
  }

  overflow = false;
  changed = false;

  ngAfterViewInit() {
    this.checkOverflow();
  }

  checkOverflow() {
    const container = this.containerElement.nativeElement;
    this.overflow = container.scrollHeight > container.clientHeight;
  }

  old_users: IUser[] = [];
  users: IUser[] = [];

  isEmpty(): boolean {
    return this.users.length === 0;
  }

  isManager(user: IUser): boolean {
    return user.Role === 'manager';
  }

  toggleRole(user: IUser): void {
    user.Role = this.isManager(user) ? 'viewer' : 'manager';
    this.changed = true;
  }

  saveChanges(): void {
    for (let i = 0; i < this.users.length; i++) {
      if (this.users[i].Role !== this.old_users[i].Role) {
        this.appApiService.updateUserRole({
          update: {
            UserEmail: this.users[i].Email,
            UpdateRole: this.users[i].Role,
          },
        });
      }
    }

    this.changed = false;
  }
}
