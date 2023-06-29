import { Component, HostListener, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Role } from '@event-participation-trends/api/user/util';
import { AppApiService } from '@event-participation-trends/app/api';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'subpagenav',
  templateUrl: './subpagenav.page.html',
  styleUrls: ['./subpagenav.page.css'],
})
export class SubPageNavPage implements OnInit{
  currentPage!: string;
  prevPage = '/home';
  public role = Role.VIEWER;  
  public appApiService: AppApiService;
  selected = 'Dashboard';
  detailsSelected = false;
  dashboardSelected = true;
  showTabs = false;
  params: {
    m: string,
    id: string,
    queryParamsHandling: string
  } | null = null;

  constructor(appApiService: AppApiService, private readonly route: ActivatedRoute, private router: Router, private navController: NavController) {
    this.appApiService = appApiService;

    this.appApiService.getRole().subscribe((response)=>{
      this.role = (response.userRole as Role) || Role.VIEWER;
    });

    this.route.queryParams.subscribe((params) => {
      this.showTabs = params['m'] === 'true';
    });

    this.params = {
      m: this.route.snapshot.queryParams['m'],
      id: this.route.snapshot.queryParams['id'],
      queryParamsHandling: this.route.snapshot.queryParams['queryParamsHandling']
    };
  }

  getRole(): Role {
    return this.role;
  }

  selectTab(option: string) {
    this.selected = option;

    if (option === 'Event Details') {
      this.detailsSelected = true;
      this.dashboardSelected = false;
      // forward params to event details page
      this.navController.navigateForward(['/event/eventdetails'], { queryParams: this.params});
      this.currentPage = '/event/eventdetails'; 
    }
    else if (option === 'Dashboard') {
      this.detailsSelected = false;
      this.dashboardSelected = true;
      // forward params to event details page
      this.navController.navigateForward(['/event/dashboard'], { queryParams: this.params});
      this.currentPage = '/event/dashboard';
    }
  }

  isLargeScreen = false;

  ngOnInit() {
    this.checkScreenSize();

    // get path from router
    this.router.events.subscribe((val) => {
      this.currentPage = this.router.url.split('?')[0];
      if (this.currentPage === '/event/createfloorplan') {
        this.prevPage = '/event/addevent';
      }
      console.log(this.currentPage + " " + this.prevPage);
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isLargeScreen = window.innerWidth >= 1310;
    console.log(window.innerWidth);
  }
}
