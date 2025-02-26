import { PublicClientApplication, BrowserCacheLocation, Configuration } from '@azure/msal-browser';
import { MSAL_INSTANCE, MsalService, MsalGuard, MsalInterceptor } from '@azure/msal-angular';
import { InjectionToken } from '@angular/core';

// 🔹 Engedélyek (Scopes) meghatározása
const loginRequest = {
  scopes: [
    "openid",
    "profile",
    "email",
    "User.Read",            // Felhasználó alapadatainak olvasása
    "Mail.Read",            // Outlook levelek olvasása
    "Calendars.ReadWrite",  // Naptár események olvasása és létrehozása
    "Files.ReadWrite",      // OneDrive fájlok kezelése
  ]
};

// 🔹 MSAL konfiguráció
const isLocalhost = window.location.origin.includes('localhost');

export function MSALInstanceFactory(): PublicClientApplication {
  const config: Configuration = {
    auth: {
      clientId: '5e20ba3e-a873-4774-bc2b-2b69f158fc7a',
      authority: 'https://login.microsoftonline.com/c7b7e4b5-d197-4a58-b592-4471870b8556',
      redirectUri: isLocalhost ? 'http://localhost:4200/home' : 'https://exai.ind-ex.ae/home',
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
      storeAuthStateInCookie: true
    },
    system: {
      allowRedirectInIframe: true
    }
  };

  const msalInstance = new PublicClientApplication(config);

  msalInstance.initialize().then(() => {
    console.log('✅ MSAL inicializálás kész!');
  });

  return msalInstance;
}

// ✅ MSAL szolgáltatás beállítása Dependency Injection-höz
export const provideMSAL = () => [
  { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
  MsalService,
  MsalGuard,
  MsalInterceptor
];

// 🔹 Exportáljuk a loginRequest-et, hogy más helyeken is használható legyen
export { loginRequest };