import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CertTableComponent } from './cert-table/cert-table.component';
import { CertificateUploadComponent } from './certificate-upload/certificate-upload.component';

@Component({
  selector: 'app-certificate',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    CertTableComponent,
    CertificateUploadComponent
  ],
  templateUrl: './certificate.component.html',
  styleUrl: './certificate.component.scss'
})
export class CertificateComponent { 
  selectedTabIndex = 0;


  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    console.log(`Tab changed to index: ${index}`);
  }
}