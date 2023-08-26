import { Component, OnInit } from '@angular/core';
import { AppApiService } from '@event-participation-trends/app/api';
import { ActivatedRoute, Router } from '@angular/router';
import { IEvent } from '@event-participation-trends/api/event/util';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconsModule, provideIcons } from '@ng-icons/core';
import { HeatmapContainerComponent } from '@event-participation-trends/app/components';

import { matCheckCircleOutline } from "@ng-icons/material-icons/outline";
import { matRadioButtonUnchecked, matSearch, matFilterCenterFocus, matZoomIn, matZoomOut } from "@ng-icons/material-icons/baseline";
import { heroAdjustmentsHorizontal } from "@ng-icons/heroicons/outline";
import { heroInboxSolid } from '@ng-icons/heroicons/solid'; 

@Component({
  selector: 'event-participation-trends-compare-page',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    NgIconsModule,
    HeatmapContainerComponent
  ],
  templateUrl: './compare-page.component.html',
  styleUrls: ['./compare-page.component.css'],
  providers: [
    provideIcons({matCheckCircleOutline, matRadioButtonUnchecked, heroAdjustmentsHorizontal, matSearch, matFilterCenterFocus, matZoomIn, matZoomOut, heroInboxSolid})
  ]
})
export class ComparePageComponent implements OnInit{
  public id = '';
  public event : any | null = null;
  public show = false;
  public loading = true;
  public categories: string[] = [];
  public events: IEvent[] = [];
  public eventList: {event: IEvent, selected: boolean}[] = [];
  public show_search = true;
  public role = 'viewer';
  public search = '';

  selectedCategory = 'Show All';
  eventsSelected = 0;
  showDropDown = false;
  

  constructor(private readonly appApiService: AppApiService, private readonly route: ActivatedRoute, private readonly router: Router) {}

  async ngOnInit() {
    // retrieve categories from API
    this.role = await this.appApiService.getRole();

    if (this.role === 'admin') {
      //get all categories
      this.categories = await this.appApiService.getAllEventCategories();

      //get all events
      this.events = await this.appApiService.getAllEvents();

      for (const event of this.events) {
        this.eventList.push({event, selected: false});
      }

    } else if (this.role === 'manager') {
      //get managed categories
      this.categories = await this.appApiService.getManagedEventCategories();

      //get managed events
      this.events = await this.appApiService.getManagedEvents();

      for (const event of this.events) {
        this.eventList.push({event, selected: false});
      }
    }

    this.loading = false;

    setTimeout(() => {
      this.show = true;
    }, 200);
  }

  toggleDropDown(): void {
    this.showDropDown = !this.showDropDown;
  }

  isSelected(category: string): boolean {
    return category === this.selectedCategory;
  }

  isSelectedEvent(event: IEvent): boolean {
    const index = this.eventList.findIndex((item) => {
      const sameName = item.event.Name === event.Name;
      const sameStartAndEndDate = item.event.StartDate === event.StartDate && item.event.EndDate === event.EndDate;
      const sameCategory = item.event.Category === event.Category;

      return sameName && sameStartAndEndDate && sameCategory;
    });
    return this.eventList[index].selected;
  }

  selectCategory(event: any): void {
    this.selectedCategory = event.target.value;
  }

  selectEvent(event: IEvent): void {
    const index = this.eventList.findIndex((item) => {
      const sameName = item.event.Name === event.Name;
      const sameStartAndEndDate = item.event.StartDate === event.StartDate && item.event.EndDate === event.EndDate;
      const sameCategory = item.event.Category === event.Category;

      return sameName && sameStartAndEndDate && sameCategory;
    });

    if (this.eventsSelected === 2 && !this.eventList[index].selected) {
      return;
    }

    this.eventList[index].selected = !this.eventList[index].selected;

    if (this.eventList[index].selected) {
      this.eventsSelected++;
    }
    else {
      this.eventsSelected--;
    }
  }

  highlightText(event: IEvent, search: string): string {
    const text = event.Name;

    if (!text) return search;
    if (!search) return text;

    const pattern = new RegExp(search, 'gi');
    return text.replace(pattern, match => `<span class="bg-opacity-70 bg-ept-bumble-yellow rounded-md">${match}</span>`);
  }

  getEventCategories() : string[] {
    const categoryList = this.categories;

    return categoryList.filter((category) => {
      return category
        ? category.toLowerCase().includes(this.search.toLowerCase())
        : false;
    });
  }

  getEvents() : IEvent[] {
    const eventList = this.events;

    if (this.selectedCategory == "Show All") {
      return eventList.filter((event) => {
        return event.Name
          ? event.Name.toLowerCase().includes(this.search.toLowerCase())
          : false;
      });
    }
    else {
      return eventList.filter((event) => {
        return event.Name
          ? event.Name.toLowerCase().includes(this.search.toLowerCase()) && event.Category == this.selectedCategory
          : false;
      });
    }
  }

  getSelectedEvents() : IEvent[] {
    const eventList = this.eventList;

    return eventList.filter((event) => {
      return event.selected;
    }).map((event) => {
      return event.event;
    });
  }
}
