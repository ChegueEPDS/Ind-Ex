import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DatabaseComponent } from "../../dataplate/database/database.component";
import { environment } from '../../../environments/environment';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PlateReaderComponent } from '../../dataplate/plate-reader/plate-reader.component';

@Component({
  selector: 'app-zonedetailes',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatCardModule, DatabaseComponent, NgxChartsModule, MatIconModule, MatButtonModule, MatDialogModule, MatRippleModule],
  templateUrl: './zonedetailes.component.html',
  styleUrl: './zonedetailes.component.scss',
  providers: [DatePipe]
})
export class ZonedetailesComponent implements OnInit {
  @Input() zone: any;

  complianceCounts = { Passed: 0, Failed: 0, NA: 0 };
  complianceCustomColors = [
    { name: 'Passed', value: '#5AA454' },
    { name: 'Failed', value: '#E44D25' },
    { name: 'NA', value: '#CFC0BB' },
  ];
  complianceChartData: { name: string; value: number }[] = [];
  chartWidth: number = 0;
  showDetailsTab: boolean = true;
  exRegisterVisible: boolean = false;

  constructor(private router: Router, private http: HttpClient, private datePipe: DatePipe, private dialog: MatDialog, private cdr: ChangeDetectorRef) {
    const navigation = this.router.getCurrentNavigation();
    this.zone = navigation?.extras.state?.['zone'];

    if (!this.zone) {
      console.error('No project data provided!');
      this.router.navigate(['/projects']);
    }
  }

  async ngOnInit(): Promise<void> {
    if (this.zone?._id) {
      await this.reloadAllData();
    }
  }

  async openPlateReader(): Promise<void> {
  if (!this.zone?._id || !this.zone?.Site) {
    console.error('Hiba: Nincs zóna, site vagy projekt ID!');
    return;
  }

  const config = {
    margin: 'auto',
    height: '70vh',
    width: '95vw',
    maxWidth: '100vw', // CDK Overlay ne korlátozza a méretet
    maxHeight: '100vh',
    panelClass: 'full-screen-modal',
    data: { Zone: this.zone._id, Site: this.zone.Site }
  };

  const dialogRef = this.dialog.open(PlateReaderComponent, config);

  dialogRef.afterClosed().subscribe(async result => {
    console.log('📌 Dialógusablak bezárult. Újratöltés:', result);

    // **Mindig frissítsd az adatokat, függetlenül attól, hogy van-e `result` vagy sem!**
    await this.reloadAllData();

    // 🔄 UI frissítés
    this.cdr.detectChanges();
  });
}

  async reloadAllData(): Promise<void> {
    await this.loadZoneDetails();
    await this.loadExRegister();
    await this.loadFromDatabase(this.zone._id);
    this.cdr.detectChanges(); // 🔄 UI frissítés
  }

  onDataChanged(): void {
    console.log("🔄 Data changed! Reloading statistics...");
    this.loadExRegister();
  }

  onTabChange(event: MatTabChangeEvent): void {
    console.log('Tab váltás:', event.index);
  
    if (event.index === 0) { // Details tab
      this.showDetailsTab = false;
      setTimeout(() => { this.showDetailsTab = true; }, 10);
    }
  
    if (event.index === 1) { // ExRegister tab
      this.exRegisterVisible = false; // 🔄 Először elrejtjük a tartalmat
      setTimeout(() => { 
        this.exRegisterVisible = true; // 🔄 Majd újra megjelenítjük
      }, 10);
    }
  }

  async loadZoneDetails(): Promise<void> {
  if (!this.zone?._id) return;
  
  const zoneUrl = `${environment.apiUrl}/api/zones/${this.zone._id}`;
  const equipmentUrl = `${environment.apiUrl}/api/exreg?Zone=${this.zone._id}`;

  try {
    this.zone = await this.http.get<any>(zoneUrl).toPromise() ?? {}; // Ha `null`, akkor üres objektum

    const equipments = await this.http.get<any[]>(equipmentUrl).toPromise() ?? []; // Ha `undefined` vagy `null`, akkor üres tömb
    this.zone.equipmentCount = Array.isArray(equipments) ? equipments.length : 0;

    this.cdr.detectChanges();
  } catch (err) {
    console.error('Error loading zone details:', err);
    this.zone.equipmentCount = 0;
  }
}

async loadExRegister(): Promise<void> {
  if (!this.zone?._id) return;

  const url = `${environment.apiUrl}/api/exreg?Zone=${this.zone._id}`;
  try {
    const data = await this.http.get<any[]>(url).toPromise() ?? []; // Üres tömb, ha nincs adat
    console.log('ExRegister data loaded:', data);

    this.complianceCounts = {
      Passed: Array.isArray(data) ? data.filter(item => item?.Compliance === 'Passed').length : 0,
      Failed: Array.isArray(data) ? data.filter(item => item?.Compliance === 'Failed').length : 0,
      NA: Array.isArray(data) ? data.filter(item => item?.Compliance === 'NA').length : 0,
    };

    this.complianceChartData = [
      { name: 'Passed', value: this.complianceCounts.Passed },
      { name: 'Failed', value: this.complianceCounts.Failed },
      { name: 'NA', value: this.complianceCounts.NA }
    ];

    this.cdr.detectChanges();
  } catch (err) {
    console.error('Error loading ExRegister data:', err);
  }
}

async loadFromDatabase(zoneId: string): Promise<void> {
  const url = `${environment.apiUrl}/api/exreg?Zone=${zoneId}`;
  try {
    const data = await this.http.get<any[]>(url).toPromise() ?? [];

    this.complianceCounts = {
      Passed: Array.isArray(data) ? data.filter(item => item?.Compliance === 'Passed').length : 0,
      Failed: Array.isArray(data) ? data.filter(item => item?.Compliance === 'Failed').length : 0,
      NA: Array.isArray(data) ? data.filter(item => item?.Compliance === 'NA').length : 0,
    };

    this.complianceChartData = Object.entries(this.complianceCounts).map(([key, value]) => ({
      name: key,
      value
    }));

    this.cdr.detectChanges();
  } catch (err) {
    console.error('Error loading data:', err);
  }
}
}