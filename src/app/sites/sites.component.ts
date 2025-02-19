import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { NewsiteComponent } from './newsite/newsite.component';
import { environment } from '../../environments/environment';
import { MatRippleModule } from '@angular/material/core';


@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, MatIconModule, MatDialogModule, MatButtonModule, MatRippleModule],
  templateUrl: './sites.component.html',
  styleUrl: './sites.component.scss',
  providers: [DatePipe]
})
export class SitesComponent implements OnInit {
  sites: any[] = []; // A projektek tárolására szolgáló tömb
  isLoading = true; // Betöltési állapot jelző

  constructor(private http: HttpClient, private dialog: MatDialog, private snackBar: MatSnackBar, private router: Router, private datePipe: DatePipe) {}

  ngOnInit(): void {
    this.fetchSites();
  }

  // Siteok lekérdezése a backendről
  fetchSites(): void {
    const token = localStorage.getItem('token');
    if (!token) {
        this.snackBar.open('Failed to fetch projects.', 'Close', { duration: 3000 });
        this.isLoading = false;
        return;
    }

    const decodedToken = this.decodeToken(token);
    const userCompany = decodedToken?.company;
    if (!userCompany) {
        console.error('Invalid token: No company found.');
        this.isLoading = false;
        return;
    }

    // 🔹 Lekérdezzük az összes site-ot
    this.http.get<any[]>(`${environment.apiUrl}/api/sites`).subscribe({
        next: (sitesData) => {
            this.sites = sitesData.filter(site => site.Company === userCompany);

            // 🔹 Lekérdezzük az összes zónát
            this.http.get<any[]>(`${environment.apiUrl}/api/zones`).subscribe({
                next: (zonesData) => {
                    this.sites.forEach(site => {
                        const siteZones: any[] = zonesData.filter(zone => zone.Site === site._id);
                        site.zoneCount = siteZones.length;  // 🔹 Helyes zónaszám beállítása
                        site.zones = siteZones.map((zone: { _id: string }) => zone._id); // Site alá tartozó zónák ID-it tároljuk
                    });

                    // 🔹 Lekérdezzük az összes eszközt az exreg API-ból
                    const equipmentRequests = this.sites.map(site =>
                        Promise.all(site.zones.map((zoneId: string) =>
                            this.http.get<any[]>(`${environment.apiUrl}/api/exreg?Zone=${zoneId}`).toPromise()
                        ))
                    );

                    Promise.all(equipmentRequests).then(results => {
                        this.sites.forEach((site, index) => {
                            site.deviceCount = results[index].flat().length; // 🔹 Összes eszköz száma az alá tartozó zónákból
                        });

                        this.isLoading = false;
                    }).catch(err => {
                        console.error('Hiba az eszközök lekérése során:', err);
                        this.sites.forEach(site => site.deviceCount = 0);
                        this.isLoading = false;
                    });

                },
                error: (err) => {
                    console.error('Hiba a zónák lekérése során:', err);
                    this.sites.forEach(site => site.zoneCount = 0);
                    this.isLoading = false;
                }
            });
        },
        error: (err) => {
            console.error('Hiba a projektek lekérése során:', err);
            this.isLoading = false;
        }
    });
}

  decodeToken(token: string | null): any {
    if (!token) return null;
    try {
       const payload = JSON.parse(atob(token.split('.')[1]));
       return payload;
    } catch (error) {
       console.error('Invalid token format:', error);
       return null;
    }
 }

   // Site részletek megnyitása
   openSiteDetails(site: any): void {
    console.log('Navigating to site:', site); // 🔍 Debug log
    if (!site || !site._id) {
      console.error('Error: Site ID is missing!', site);
      return;
    }
    this.router.navigate(['/site'], { queryParams: { siteId: site._id } });
  }

  // Új projekt létrehozása modális dialóguson keresztül
  openNewSiteDialog(): void {
    const dialogRef = this.dialog.open(NewsiteComponent, {
      width: '600px', // A dialog szélessége
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.fetchSites(); // Frissítsd a projektlistát, ha sikeres mentés történt
      }
    });
  }

  // Projekt törlése
  deleteProject(siteId: string): void {
    const confirmed = confirm('Are you sure you want to delete this project?');
    if (confirmed) {
      this.http.delete(`${environment.apiUrl}/api/sites/${siteId}`).subscribe({
        next: () => {
          this.snackBar.open('Project successfully deleted!', 'Close', { duration: 3000 });
          this.sites = this.sites.filter((site) => site._id !== siteId); // Törölt projekt eltávolítása a listából
        },
        error: (err) => {
          console.error('Hiba a projekt törlése során:', err);
          this.snackBar.open('Failed to delete project.', 'Close', { duration: 3000 });
        },
      });
    }
  }
}
