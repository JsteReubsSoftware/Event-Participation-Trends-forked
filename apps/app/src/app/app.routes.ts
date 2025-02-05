import { Route } from '@angular/router';
import { LandingComponent } from '@event-participation-trends/app/landing';

export const appRoutes: Route[] = [
    {
        path: '',
        component: LandingComponent
    },
    {
        path: 'home',
        loadChildren: () => import('@event-participation-trends/app/home').then(m => m.AppHomeModule)
    },
    {
        path: 'event',
        loadChildren: () => import('@event-participation-trends/app/event-view').then(m => m.AppEventViewModule)
    }
];
