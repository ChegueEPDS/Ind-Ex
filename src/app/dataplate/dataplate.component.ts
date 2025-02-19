import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { PlateReaderComponent } from "./plate-reader/plate-reader.component";
import { DatabaseComponent } from "./database/database.component";
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
// import { InspectionComponent } from "./inspection/inspection.component";
// import { ZoneComponent } from "../zone/zone.component";

@Component({
  selector: 'app-dataplate',
  templateUrl: './dataplate.component.html',
  styleUrls: ['./dataplate.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    PlateReaderComponent,
    DatabaseComponent,
    MatIconModule,
   // InspectionComponent,
   // ZoneComponent
],
})
export class DataplateComponent {
  selectedTabIndex = 0;


  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    console.log(`Tab changed to index: ${index}`);
  }
}