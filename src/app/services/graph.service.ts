import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';
import { loginRequest } from './msal.config';
import { AuthenticationResult, AccountInfo } from '@azure/msal-browser';
import { environment } from '../../environments/environment'; // 🔹 Importáld az environment fájlt

@Injectable({
  providedIn: 'root'
})
export class GraphService {
  private apiBaseUrl = `${environment.apiUrl}/api/graph`; // 🔹 Most már az environment-ből veszi az URL-t

  constructor(private http: HttpClient, private msalService: MsalService) {
    // 🔹 Beállítjuk az aktív fiókot, ha van bejelentkezett felhasználó
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
        let activeAccount = this.msalService.instance.getActiveAccount();

        if (!activeAccount) {
            console.warn('⚠️ Nincs aktív bejelentkezett fiók, megpróbáljuk beállítani...');
            const accounts = this.msalService.instance.getAllAccounts();
            if (accounts.length > 0) {
                this.msalService.instance.setActiveAccount(accounts[0]);
                activeAccount = accounts[0];
                console.log("✅ Aktív fiók beállítva:", activeAccount);
            } else {
                console.error('❌ Nincs aktív bejelentkezett fiók. Jelentkezz be újra!');
                return null;
            }
        }

        // 🔹 Token lekérése háttérben (silent mód)
        try {
            const response = await this.msalService.instance.acquireTokenSilent({
                ...loginRequest,
                account: activeAccount
            });
            console.log('✅ Microsoft Graph Access Token megszerezve:', response.accessToken);
            return response.accessToken;
        } catch (silentError) {
            console.warn("⚠️ Silent token lekérés sikertelen, interaktív bejelentkezés szükséges:", silentError);

            // 🔹 Ha sikertelen, interaktív popup kérést küldünk
            const interactiveResponse = await this.msalService.instance.acquireTokenPopup(loginRequest);
            console.log('✅ Microsoft Graph Access Token (popup) megszerezve:', interactiveResponse.accessToken);
            return interactiveResponse.accessToken;
        }
    } catch (error) {
        console.error("❌ Microsoft Graph Access Token lekérése sikertelen:", error);
        return null;
    }
}

async createFolder(folderName: string) {
  const accessToken = await this.getAccessToken();
  if (!accessToken) {
      console.error('❌ Nem sikerült access tokent szerezni!');
      return;
  }

  console.log("📌 Küldendő Access Token:", accessToken);

  const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,  // 🔹 Itt küldjük a Microsoft Graph tokent
      'Content-Type': 'application/json'
  });

  return this.http.post(`${this.apiBaseUrl}/onedrive/folder`, { folderName }, { headers }).toPromise();
}

async uploadFile(selectedFile: File, targetFolder: string) {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      console.error("❌ Nem sikerült access tokent szerezni!");
      return;
    }
  
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("folderName", targetFolder); // 📂 Dinamikusan adható meg a mappa
  
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
    });
  
    return this.http.post(`${this.apiBaseUrl}/onedrive/upload`, formData, { headers }).toPromise();
  }
}