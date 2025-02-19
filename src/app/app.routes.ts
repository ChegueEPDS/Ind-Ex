import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AssistantComponent } from './assistant/assistant.component';
import { LoginComponent } from './login/login.component';
import { StatisticsComponent } from './statistics/statistics.component';
import { FeedbackTableComponent } from './feedback-table/feedback-table.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminComponent } from './admin/admin.component';
import { DataplateComponent } from './dataplate/dataplate.component';
import { CertificateComponent } from './certificate/certificate.component';
import { ZonedetailesComponent } from './zone/zonedetailes/zonedetailes.component';
import { SitesComponent } from './sites/sites.component';
import { SitedetailComponent } from './sites/sitedetail/sitedetail.component';
import { XlsCompareComponent } from './xls-compare/xls-compare.component';
import { ImageAnalysisComponent } from './image-analysis/image-analysis.component';


export const routes: Routes = [
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'assistant', component: AssistantComponent, canActivate: [AuthGuard]},
  { path: 'login', component: LoginComponent },
  { path: 'stat', component: StatisticsComponent, canActivate: [AuthGuard]},
  { path: 'feedback', component: FeedbackTableComponent, canActivate: [AuthGuard]},
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard]},
  { path: 'exreg', component: DataplateComponent, canActivate: [AuthGuard]},
  { path: 'cert', component: CertificateComponent, canActivate: [AuthGuard]},
  { path: 'zone-details', component: ZonedetailesComponent, canActivate: [AuthGuard]},
  { path: 'sites', component: SitesComponent, canActivate: [AuthGuard]},
  { path: 'site', component: SitedetailComponent, canActivate: [AuthGuard]},
  { path: 'xls', component: XlsCompareComponent, canActivate: [AuthGuard]},
  { path: 'img', component: ImageAnalysisComponent, canActivate: [AuthGuard]},
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

export const AppRoutes = routes;
