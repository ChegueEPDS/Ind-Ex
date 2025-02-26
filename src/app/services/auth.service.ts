import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Router, NavigationEnd } from '@angular/router';
import { CountdownSnackbarComponent } from '../countdown-snackbar/countdown-snackbar.component';
import { JwtTokenData } from './jwtTokenData.interface';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import { loginRequest } from './msal.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/api`;
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();
  private isAdminSubject = new BehaviorSubject<boolean>(this.isAdmin());
  isAdmin$ = this.isAdminSubject.asObservable();
  private tokenExpirationTimer: any;

  constructor(
    private http: HttpClient, 
    private snackBar: MatSnackBar, 
    private router: Router, 
    private msalService: MsalService
  ) {
    const isAuthenticated = this.isAuthenticated();
    this.isLoggedInSubject.next(isAuthenticated);

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.handleNavigation();
      }
    });

    this.startTokenExpirationWatcher();
  }

  private handleNavigation(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const tokenData = this.parseJwt(token);
      this.scheduleTokenExpiryWarning(tokenData.exp);
    }
  }

  // 🔹 **Normál bejelentkezés (email + jelszó)**
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, { email, password });
  }

  // 🔹 **Microsoft bejelentkezés (MSAL + Backend validáció)**
  async loginWithMicrosoft() {
    try {
      // 🔹 Bejelentkezés az MSAL-on keresztül a megadott scopes-szal
      const response = await this.msalService.loginPopup(loginRequest).toPromise();
    
      if (!response || !response.accessToken) {
        console.error('❌ MSAL válasz nem tartalmaz access tokent.');
        return;
      }
  
      console.log('✅ Microsoft bejelentkezés sikeres:', response);
  
      // 🔹 Küldjük az MSAL access tokent a backendnek, hogy JWT tokent kapjunk
      const jwtResponse = await this.http.post<{ token: string }>(
        `${this.baseUrl}/microsoft-login`, 
        { accessToken: response.accessToken }
      ).toPromise();
  
      if (jwtResponse?.token) {
        this.setSession(jwtResponse.token);
        console.log('✅ JWT token mentve:', jwtResponse.token);
        this.router.navigate(['/home']);
      } else {
        console.error('❌ A backend nem adott vissza JWT tokent.');
      }
    } catch (error) {
      console.error('❌ Microsoft bejelentkezési hiba:', error);
      this.snackBar.open('Microsoft bejelentkezés sikertelen.', 'Bezárás', { duration: 5000 });
    }
  }

  logout() {
    console.log('🔹 Kijelentkezés megkezdése...');

    // 🔹 JWT token lekérése a localStorage-ból
    const token = localStorage.getItem('token');
    let isMicrosoftUser = false;

    if (token) {
        const decodedToken = this.parseJwt(token); // 🔹 Már meglévő parseJwt metódus
        isMicrosoftUser = !!decodedToken['azureId']; // Ha az azureId létezik, akkor Microsoft user
    }

    // 🔹 Töröljük az interakciós állapotokat
    sessionStorage.removeItem('msal.interaction.status');
    localStorage.removeItem('msal.interaction.status');

    this.clearSession(); // JWT token törlése

    if (isMicrosoftUser) {
        console.log('🔹 Microsoft fiókkal bejelentkezett felhasználó - MSAL logout indul.');
        this.msalService.logoutPopup().subscribe({
            next: () => {
                console.log('✅ MSAL popup logout sikeres');
                this.http.post(`${this.baseUrl}/logout`, {}).subscribe(() => {
                    console.log('✅ Backend kijelentkezés sikeres');
                    this.router.navigate(['/login']);
                });
            },
            error: (error) => {
                console.warn('⚠️ MSAL popup logout sikertelen, próbálkozás redirecttel...', error);
                this.msalService.logoutRedirect();
            }
        });
    } else {
        console.log('🔹 Normál felhasználó - Csak JWT törlése és átirányítás.');
        this.http.post(`${this.baseUrl}/logout`, {}).subscribe(() => {
            console.log('✅ Backend kijelentkezés sikeres');
            this.router.navigate(['/login']);
        });
    }
}

  setSession(token: string): void {
    if (!token) {
      console.error('❌ Hiba: Nincs token a session mentéshez.');
      return;
    }
  
    console.log('✅ Access Token mentése:', token);
    localStorage.setItem('token', token);
  
    this.isLoggedInSubject.next(true);
    this.isAdminSubject.next(this.isAdmin());
  
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
  
    const tokenData = this.parseJwt(token);
    this.scheduleTokenExpiryWarning(tokenData.exp);
    this.startTokenExpirationWatcher();
  }

  clearSession(): void {
    console.log('🔹 Felhasználói session törlése...');
  
    localStorage.removeItem('token');
    this.isLoggedInSubject.next(false);
    this.isAdminSubject.next(false);
  
    sessionStorage.removeItem('msal.interaction.status');
    localStorage.removeItem('msal.interaction.status');
  
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const tokenData = this.parseJwt(token);
    const expirationDate = tokenData.exp * 1000;

    if (Date.now() >= expirationDate) {
      this.clearSession();
      return false;
    }

    return true;
  }

  parseJwt(token: string): JwtTokenData {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      return JSON.parse(jsonPayload) as JwtTokenData;
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return { exp: 0 };
    }
  }

  scheduleTokenExpiryWarning(expirationTime: number): void {
    const currentTime = Date.now();
    const expirationDate = expirationTime * 1000;
    const warningTime = expirationDate - 30 * 1000;

    if (currentTime < warningTime) {
      const timeUntilWarning = warningTime - currentTime;
      setTimeout(() => this.showCountdownSnackbar(expirationDate), timeUntilWarning);
    }
  }

  showCountdownSnackbar(expirationDate: number): void {
    const remainingTime = Math.round((expirationDate - Date.now()) / 1000);

    this.snackBar.openFromComponent(CountdownSnackbarComponent, {
      data: {
        message: 'Your session will expire in:',
        countdown: remainingTime,
        extendSession: () => this.renewToken(),
      },
      verticalPosition: 'top',
    });
  }

  renewToken() {
    this.http.post<{ token: string }>(`${this.baseUrl}/renew-token`, {}).subscribe(
      (response) => {
        if (response.token) {
          this.setSession(response.token);
          console.log('Token sikeresen megújítva.');
        }
      },
      (error) => {
        console.error('Token megújítása sikertelen:', error);
        this.clearSession();
      }
    );
  }

  private startTokenExpirationWatcher(): void {
    const token = localStorage.getItem('token');
    if (!token) return;
  
    const tokenData = this.parseJwt(token);
    const expirationTime = tokenData.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;
  
    if (timeUntilExpiration > 0) {
      this.tokenExpirationTimer = setTimeout(() => {
        console.log('Token expired. Redirecting to login.');
        this.clearSession();
        this.router.navigate(['/login']);
      }, timeUntilExpiration);
    } else {
      this.clearSession();
      this.router.navigate(['/login']);
    }
  }

  getUserRole(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const tokenData = this.parseJwt(token);
    return tokenData.role ?? null;
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'Admin';
  }

  microsoftLogin(accessToken: string) {
    return this.http.post<{ token: string }>(`${this.baseUrl}/microsoft-login`, { accessToken });
  }
  getUserId(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
  
    const tokenData = this.parseJwt(token);
    return tokenData.userId ?? null;
  }
}