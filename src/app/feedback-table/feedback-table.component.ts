import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import { NgIf, AsyncPipe, DatePipe, CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-feedback-table',
  standalone: true,
  imports: [
    NgIf,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    AsyncPipe,
    DatePipe,
    CommonModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './feedback-table.component.html',
  styleUrls: ['./feedback-table.component.scss']
})
export class FeedbackTableComponent implements OnInit {
  displayedColumns: string[] = ['submittedAt', 'question', 'answer', 'feedback', 'references'];
  dataSource = new MatTableDataSource<any>([]);

  expandedRows: { [key: number]: boolean } = {};

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadFeedback();
  }

  loadFeedback() {
    this.http.get<any[]>(`${environment.apiUrl}/api/feedback`).subscribe({
      next: (data) => {
        console.log(data); // Itt nézheted meg, hogy milyen formában jön a submittedAt mező
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: (error) => {
        console.error('Hiba történt a visszajelzések lekérdezése során:', error);
      }
    });
  }

  toggleExpand(rowIndex: number): void {
    this.expandedRows[rowIndex] = !this.expandedRows[rowIndex]; // Váltás az összecsukott/kibontott állapot között
  }
}