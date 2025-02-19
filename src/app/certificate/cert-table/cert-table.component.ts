import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

export interface Certificate {
  certNo: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  xcondition?: boolean;
  specCondition?: string;
}

@Component({
  selector: 'app-cert-table',
  standalone: true,
  imports: [
    HttpClientModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    CommonModule
  ],
  templateUrl: './cert-table.component.html',
  styleUrl: './cert-table.component.scss'
})


export class CertTableComponent implements OnInit {
  certificates: Certificate[] = [];
  displayedColumns: string[] = [
    'certNo',
    'specCondition',
    'uploadedAt',
    'actions'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchCertificates();
  }

  fetchCertificates(): void {
    this.http.get<Certificate[]>(`${environment.apiUrl}/api/certificates`).subscribe({
      next: (data) => this.certificates = data,
      error: (err) => console.error('Hiba a tanúsítványok betöltése során:', err)
    });
  }
}
