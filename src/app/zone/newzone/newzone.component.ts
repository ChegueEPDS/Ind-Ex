import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../environments/environment';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-newzone',
  standalone: true,
  imports: [
    MatButtonModule,
    ReactiveFormsModule,
    CommonModule,
    MatFormFieldModule,
    MatOptionModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './newzone.component.html',
  styleUrls: ['./newzone.component.scss'],
})
export class NewzoneComponent {
  zoneForm: FormGroup;
  availableSites: any[] = [];
  selectedSiteId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<NewzoneComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { siteId: string | null }
  ) {
    this.selectedSiteId = data?.siteId || null; // Megkapott siteId beállítása
  
    this.zoneForm = this.fb.group({
      Name: ['', [Validators.required]],
      Site: [this.selectedSiteId, Validators.required],
      Description: ['', [Validators.maxLength(255)]],
      Environment: ['', [Validators.required]],
      Zone: [null],
      SubGroup: [null],
      TempClass: [null],
      MaxTemp: [null, [Validators.min(0)]],
    });
  
    if (this.selectedSiteId) {
      this.zoneForm.get('Site')?.disable(); // 🔹 Ha van Site ID, tiltsuk le a mezőt
    }
  
    console.log("✅ FormGroup inicializálva:", this.zoneForm.value);
  }

  ngOnInit(): void {
    this.loadSites();
  }

  // 🔹 Site adatok betöltése az API-ból
  loadSites(): void {
    this.http.get(`${environment.apiUrl}/api/sites`).subscribe({
      next: (sites: any) => {
        this.availableSites = sites;
      },
      error: (err) => {
        console.error("❌ Nem sikerült betölteni a Site adatokat:", err);
        this.snackBar.open('Failed to load projects.', 'Close', { duration: 3000 });
      }
    });
  }

  onSubmit(): void {
    console.log("📝 Form adatok a beküldés pillanatában:", this.zoneForm.value);
    if (this.zoneForm.valid) {
      const token = localStorage.getItem('token');
      if (!token) {
        this.snackBar.open('Authorization token missing.', 'Close', { duration: 3000 });
        return;
      }
  
      // 🔹 Form adatok összegyűjtése
      const zoneData = { 
        ...this.zoneForm.getRawValue(), // 🔹 getRawValue() tartalmazza a disabled mezőket is
        Site: this.selectedSiteId ?? this.zoneForm.get('Site')?.value // 🔹 Site hozzáadása manuálisan
      };
  
      console.log("📤 Küldött adatok:", zoneData);
  
      this.http.post(`${environment.apiUrl}/api/zones`, zoneData).subscribe({
        next: () => {
          this.snackBar.open('Zone successfully created!', 'Close', { duration: 3000 });
          this.dialogRef.close(true); // 🔹 Bezárja a modált és jelez a szülő komponensnek
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Failed to create zone.', 'Close', { duration: 3000 });
        },
      });
    } else {
      this.snackBar.open('Please fill out all required fields correctly.', 'Close', { duration: 3000 });
    }
  }

  // Getter az Environment mező egyszerű eléréséhez
  get environment() {
    return this.zoneForm.get('Environment')?.value;
  }
}