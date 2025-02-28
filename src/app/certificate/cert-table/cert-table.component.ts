import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { GraphService } from '../../services/graph.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';


export interface Certificate {
  _id: string;
  certNo: string;
  status: string;
  issueDate: string;
  applicant: string;
  protection: string;
  equipment: string;        
  manufacturer: string;     
  exmarking: string;        
  fileName: string;
  fileUrl: string;
  fileId?: string;
  uploadedAt: string;
  xcondition?: boolean;
  specCondition?: string;
  description?: string;
  scheme?: string;
}

@Component({
  selector: 'app-cert-table',
  standalone: true,
  imports: [
    HttpClientModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    CommonModule,
    MatCheckboxModule,
    MatToolbarModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './cert-table.component.html',
  styleUrl: './cert-table.component.scss'
})

export class CertTableComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<Certificate>([]);
  selection = new SelectionModel<Certificate>(true, []);
  displayedColumns: string[] = [
    'select',
    'certNo',
    'scheme',
    'status',
    'issueDate',
    'applicant',
    'protection',
    'exmarking',   
    'equipment',   
    'manufacturer',
    'description',
    'specCondition',
    'actions'
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  selectedRow: any = null;
  
  constructor(private http: HttpClient, private graphService: GraphService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.fetchCertificates();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  fetchCertificates(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.snackBar.open('❌ Sikertelen lekérdezés: nincs bejelentkezve.', 'Bezárás', { duration: 3000 });
      return;
    }
  
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  
    this.http.get<Certificate[]>(`${environment.apiUrl}/api/certificates`, { headers }).subscribe({
      next: (data) => {
        console.log("📥 Tanúsítványok betöltve:", data);
        this.dataSource.data = data;
      },
      error: (err) => {
        console.error("❌ Hiba a tanúsítványok betöltése során:", err);
        this.snackBar.open('❌ Hiba történt a tanúsítványok betöltésekor.', 'Bezárás', { duration: 3000 });
      }
    });
  }

  /** Visszaadja, hogy az összes sor ki van-e jelölve */
  isAllSelected() {
    return this.selection.selected.length === this.dataSource.data.length;
  }

  /** Az összes sor kijelölése vagy törlése */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.dataSource.data);
    }
  }

  selectRow(row: any): void {
    if (this.selection.isSelected(row)) {
      this.selection.deselect(row); // Ha a sor már ki van jelölve, töröljük a kijelölést
    } else {
      this.selection.select(row); // Ha nincs kijelölve, kijelöljük
    }
  
    // A `selectedRow` változót frissítjük, hogy vizuálisan is látszódjon a kiválasztás
    this.selectedRow = this.selection.isSelected(row) ? row : null;
  }

  /** Checkbox címkéje */
  checkboxLabel(row?: Certificate): string {
    return row
      ? `${this.selection.isSelected(row) ? 'Deselect' : 'Select'} row`
      : `${this.isAllSelected() ? 'Deselect' : 'Select'} all`;
  }

  /** 📥 XLSX EXPORT */
  exportToExcel(): void {
    const exportData = this.selection.selected.length > 0 ? this.selection.selected : this.dataSource.data;

    if (exportData.length === 0) {
      console.warn("Nincs adat az exportáláshoz.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Certificates');

    // Fejléc létrehozása
    worksheet.columns = [
      { header: 'Certificate No', key: 'certNo', width: 20 },
      { header: 'Scheme', key: 'scheme', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Date of Issue', key: 'issueDate', width: 15 },
      { header: 'Applicant', key: 'applicant', width: 40 },
      { header: 'Type of Protection', key: 'protection', width: 30 },
      { header: 'Ex Marking', key: 'exmarking', width: 30 },
      { header: 'Equipment', key: 'equipment', width: 30 },
      { header: 'Manufacturer', key: 'manufacturer', width: 40 },
      { header: 'Description', key: 'description', width: 100 },
      { header: 'Spec Condition', key: 'specCondition', width: 100 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FCB040' } }; // Narancssárga szöveg
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2E2109' }, // Sötétszürke háttér
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Középre igazítás
    });

    // Adatok hozzáadása
    exportData.forEach(cert => {
      worksheet.addRow({
        certNo: cert.certNo,
        scheme: cert.scheme || '',
        status: cert.status || '',
        issueDate: cert.issueDate || '',
        applicant: cert.applicant || '',
        protection: cert.protection || '',
        exmarking: cert.exmarking || '',
        equipment: cert.equipment || '',
        manufacturer: cert.manufacturer || '',
        description: cert.description || '',
        specCondition: cert.specCondition || '',
        uploadedAt: cert.uploadedAt || ''
      });
    });

    // Fájl generálás és letöltés
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'certificates.xlsx');
    });
  }

  async deleteSelectedCertificates() {
    if (this.selection.selected.length === 0) {
      alert("❌ Nincs kijelölt tanúsítvány törlésre!");
      return;
    }
  
    if (!confirm("Biztosan törölni szeretnéd a kijelölt tanúsítványokat?")) {
      return;
    }
  
    try {
      const token = await this.graphService.getAccessToken();
      if (!token) {
        console.error("❌ Hiányzó token! A felhasználó nincs bejelentkezve.");
        alert("Nincs érvényes belépési token. Kérlek, jelentkezz be újra!");
        window.location.href = "/login";
        return;
      }
  
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  
      const deleteRequests = this.selection.selected.map(cert =>
        this.http.delete(`${environment.apiUrl}/api/certificates/${cert._id}`, { headers }).toPromise()
      );
  
      const results = await Promise.allSettled(deleteRequests);
  
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`❌ Nem sikerült törölni: ${this.selection.selected[index].certNo}`);
        }
      });
  
      console.log("✅ Kijelölt tanúsítványok törölve.");
      this.selection.clear();
      this.fetchCertificates();
    } catch (error) {
      console.error("❌ Hiba a tanúsítványok tömeges törlésekor:", error);
    }
  }
}