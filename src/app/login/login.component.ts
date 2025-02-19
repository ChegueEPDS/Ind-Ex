import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import { firstValueFrom } from 'rxjs';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule, 
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    CommonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  hide = signal<boolean>(true);
  email = signal<string>('');
  password = signal<string>('');
  isShaking = signal<boolean>(false);

  constructor(
    private authService: AuthService, 
    private msalService: MsalService, 
    private router: Router, 
    private route: ActivatedRoute, 
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        localStorage.setItem('jwt', token);
        this.authService.setSession(token);
        this.router.navigate(['/dashboard']);
      }
    });
  }

  clickEvent(event: MouseEvent): void {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  login() {
    const emailValue = this.email();
    const passwordValue = this.password();
  
    this.authService.login(emailValue, passwordValue).subscribe({
      next: (response) => {
        const token = response.token;
        console.log('Kapott token:', token);
        this.authService.setSession(token);
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('Bejelentkezés sikertelen', error);
        this.snackBar.open(error?.error?.message || 'Bejelentkezés sikertelen. Próbáld újra.', 'Bezárás', { duration: 5000 });
        this.isShaking.set(true);
        setTimeout(() => this.isShaking.set(false), 800);
      }
    });
  }

  async loginWithMicrosoft() {
    console.log('🔹 Microsoft bejelentkezés indítása...');
    
    // 🔹 Előzetesen töröljük az esetleges "interaction in progress" státuszt
    sessionStorage.removeItem('msal.interaction.status');
    localStorage.removeItem('msal.interaction.status');
  
    try {
      const response = await firstValueFrom(this.msalService.loginPopup());
      console.log('✅ Microsoft bejelentkezés sikeres:', response);
  
      if (!response.accessToken) {
        console.error('❌ Microsoft bejelentkezési hiba: Nincs access token.');
        return;
      }
  
      // 🔹 Küldjük az access tokent a backendnek, hogy JWT tokent kapjunk
      this.authService.microsoftLogin(response.accessToken).subscribe({
        next: (jwtResponse) => {
          console.log('✅ JWT Token fogadva:', jwtResponse.token);
          this.authService.setSession(jwtResponse.token);
          this.router.navigate(['/home']);
        },
        error: (error) => {
          console.error('❌ Backend hiba Microsoft login után:', error);
        }
      });
    } catch (error) {
      console.error('❌ Microsoft bejelentkezési hiba:', error);
      this.snackBar.open('Microsoft bejelentkezés sikertelen.', 'Bezárás', { duration: 5000 });
    }
  }
}