import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    NgxChartsModule,
    MatIconModule
  ]
})
export class StatisticsComponent implements OnInit {
  categoryCount: { [key: string]: number } = {};
  globalAverageRating: number = 0;
  categoryAverages: { [key: string]: number } = {};
  chartData: { name: string, value: number }[] = [];
  ratingChartData: { name: string, value: number }[] = [];
  isLoading: boolean = true; // Betöltés állapotának követése
  errorMessage: string | null = null; // Hibaüzenetek kezelése

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchStatistics();
  }

  // Statisztikák betöltése a backendből
  fetchStatistics() {
    const apiUrl = `${environment.apiUrl}/api/combined-statistics`;
    const token = localStorage.getItem('token');
  
    if (!token) {
      console.error('JWT token is missing. Please login again.');
      this.errorMessage = 'JWT token hiányzik. Kérjük, jelentkezzen be újra.';
      this.isLoading = false;
      return;
    }
  
    this.http.get<{
      categoryCount: Record<string, number>,
      globalAverageRating: number,
      categoryAverages: Record<string, number>
    }>(apiUrl, {
      headers: { Authorization: `Bearer ${token}` } // Közvetlen fejléc hozzáadás
    }).subscribe(
      (response) => {
        this.categoryCount = response.categoryCount || {};
        this.globalAverageRating = response.globalAverageRating || 0;
        this.categoryAverages = response.categoryAverages || {};
  
        this.prepareChartData();
        this.isLoading = false;
        console.log('Statistics loaded successfully:', response);
      },
      (error) => {
        console.error('Failed to fetch statistics:', error);
        this.errorMessage = error.error?.error || 'Nem sikerült betölteni a statisztikát.';
        this.isLoading = false;
      }
    );
  }

  private prepareChartData() {
    // Kategória kérdésszám statisztikák feldolgozása
    this.chartData = Object.keys(this.categoryCount).map(category => ({
      name: category,
      value: this.categoryCount[category]
    }));

    // Kategóriánkénti értékelési statisztikák feldolgozása
    this.ratingChartData = Object.keys(this.categoryAverages).map(category => ({
      name: category,
      value: this.categoryAverages[category]
    }));
  }

  get Math() {
    return Math;
  }
}