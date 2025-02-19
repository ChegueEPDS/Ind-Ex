import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NewzoneComponent } from './newzone/newzone.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { MatRippleModule } from '@angular/material/core';
@Component({
  selector: 'app-zone',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, MatIconModule, MatDialogModule, MatButtonModule, MatRippleModule],
  templateUrl: './zone.component.html',
  styleUrls: ['./zone.component.scss'],
  providers: [DatePipe]
})
export class ZoneComponent implements OnInit {
  zones: any[] = []; // A zónák tárolására szolgáló tömb
  isLoading = true; // Betöltési állapot jelző
  siteId: string | null = null; // Az aktuális site azonosítója

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute, // 📌 Hozzáadva az URL-ből érkező `siteId` olvasásához
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      console.log('Query params:', params); // 🔍 Debug log
      this.siteId = params['siteId'] || null;
      
      if (this.siteId) {
        console.log('SiteId found:', this.siteId); // ✅ Ellenőrizzük, hogy a siteId megvan-e
        this.fetchZones();
      } else {
        console.error('No siteId found in URL.');
        this.isLoading = false;
      }
    });
  }

  // 🔹 Zone-ok lekérdezése az adott site alapján
  fetchZones(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token missing.');
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

    this.http.get<any[]>(`${environment.apiUrl}/api/zones?siteId=${this.siteId}`).subscribe({
      next: (data) => {
        // 🔹 Csak az adott site és a felhasználó cégéhez tartozó zone-okat listázzuk
        this.zones = data.filter(zone => zone.Company === userCompany);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Hiba a zónák lekérése során:', err);
        this.isLoading = false;
        this.snackBar.open('Failed to load zones.', 'Close', { duration: 3000 });
      },
    });
  }

  decodeToken(token: string | null): any {
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])); // JWT dekódolás
    } catch (error) {
      console.error('Token dekódolása sikertelen:', error);
      return null;
    }
  }

  // 🔹 Zóna részleteinek megnyitása
  openZoneDetails(zone: any): void {
    this.router.navigate(['/zone-details'], { state: { zone } });
  }

  // 🔹 Új zóna létrehozása modális dialóguson keresztül
  openNewZoneDialog(): void {
    const dialogRef = this.dialog.open(NewzoneComponent, {
      width: '600px', // A dialog szélessége
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.fetchZones(); // 🔄 Frissítjük a zone listát, ha sikeres mentés történt
      }
    });
  }

  // 🔹 Zóna törlése
  deleteZone(zoneId: string): void {
    const confirmed = confirm('Are you sure you want to delete this zone?');
    if (confirmed) {
      this.http.delete(`${environment.apiUrl}/api/zones/${zoneId}`).subscribe({
        next: () => {
          this.snackBar.open('Zone successfully deleted!', 'Close', { duration: 3000 });
          this.zones = this.zones.filter((zone) => zone._id !== zoneId); // 🔄 Törölt zóna eltávolítása a listából
        },
        error: (err) => {
          console.error('Hiba a zóna törlése során:', err);
          this.snackBar.open('Failed to delete zone.', 'Close', { duration: 3000 });
        },
      });
    }
  }
}