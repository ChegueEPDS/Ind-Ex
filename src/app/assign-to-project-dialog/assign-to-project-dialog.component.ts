import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-assign-to-project-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    CommonModule,
    FormsModule // 🛠️ Itt is importáld be!
  ],
  templateUrl: './assign-to-project-dialog.component.html',
  styleUrl: './assign-to-project-dialog.component.scss'
})
export class AssignToProjectDialogComponent implements OnInit {
  sites: any[] = []; // Site lista
  zones: any[] = []; // Zone lista
  filteredZones: any[] = []; // Site-hoz tartozó Zone-ok

  selectedSiteId: string | null = null; // Kiválasztott Site ID
  selectedZoneId: string | null = null; // Kiválasztott Zone ID

  constructor(
    public dialogRef: MatDialogRef<AssignToProjectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sites: any[], zones: any[], currentSiteId: string | null, currentZoneId: string | null }
  ) {
    this.sites = data.sites;
    this.zones = data.zones;
  }

  ngOnInit(): void {
    console.log("Kapott Site ID:", this.data.currentSiteId);
    console.log("Kapott Zone ID:", this.data.currentZoneId);

    this.selectedSiteId = this.data.currentSiteId || null;
    this.selectedZoneId = this.data.currentZoneId || null;

    if (this.selectedSiteId) {
      this.filterZones();
    }
  }

  onSiteChange(): void {
    if (this.selectedSiteId) {
      this.filterZones();
    } else {
      this.filteredZones = [];
      this.selectedZoneId = null;
    }
  }

  filterZones(): void {
    this.filteredZones = this.zones.filter(zone => zone.Site === this.selectedSiteId);
    if (!this.filteredZones.some(zone => zone._id === this.selectedZoneId)) {
      this.selectedZoneId = null;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onAssign(): void {
    this.dialogRef.close({ siteId: this.selectedSiteId, zoneId: this.selectedZoneId });
  }
}