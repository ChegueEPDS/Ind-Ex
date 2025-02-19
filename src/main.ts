import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // withInterceptors importálása
import { AppComponent } from './app/app.component';
import { AppRoutes } from './app/app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './app/auth.interceptor'; // authInterceptor importálása
import { provideMSAL, MSALInstanceFactory } from './app/services/msal.config';


bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(AppRoutes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor]) // authInterceptor hozzáadása
    ),
    provideAnimationsAsync(),
    ...provideMSAL()
  ]
});