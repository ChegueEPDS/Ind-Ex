import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router); // Router injektálása az átirányításhoz
  const token = localStorage.getItem('token'); // Token lekérése

  // Ha van token, hozzáadjuk a kéréshez
  const authReq = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    : req;

  // A kérés továbbadása, és válasz figyelése hibakezeléssel
  return next(authReq).pipe(
    catchError((error) => {
      if (error.status === 401) {
        console.error('Token expired or invalid. Redirecting to login...');
        localStorage.removeItem('token'); // Token eltávolítása
        router.navigate(['/login']); // Átirányítás a login oldalra
      }
      return throwError(() => error); // A hiba újra feldobása, ha nem 401-es
    })
  );
};