import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { filter } from 'rxjs';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatToolbarModule, 
    MatButtonModule, 
    MatIconModule, 
    MatDividerModule, 
    MatMenuModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  isMobileView = false;
  isLoggedIn = false;
  isAdmin = false; // Új property az admin jog ellenőrzéséhez
  private loginSubscription!: Subscription;
  isDatabaseVisible = false; // Láthatóság állapota

  constructor(private authService: AuthService, private router: Router, private breakpointObserver: BreakpointObserver ) {}

  ngOnInit() {
    // Mobil nézet figyelése
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobileView = result.matches;
    });
  
    // Feliratkozás a bejelentkezési állapotra
    this.loginSubscription = this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
    });
  
    // Feliratkozás az adminisztrátori állapotra
    this.authService.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    });
  
    // Router események figyelése
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      console.log('Navigation event:', event.urlAfterRedirects);
      this.isDatabaseVisible = event.urlAfterRedirects.includes('/exreg');
    });
  }

  onSearch(filterValue: string) {
    // Kezeld a keresési eseményt, és továbbítsd a megfelelő komponens felé
    console.log('Search term:', filterValue);
  }

  EPDS() {
    window.open('https://www.epds.hu', '_blank');
  }

  logout() {
    this.authService.logout();
  }

  ngOnDestroy() {
    // Unsubscribe to avoid memory leaks
    if (this.loginSubscription) {
      this.loginSubscription.unsubscribe();
    }
  }
}