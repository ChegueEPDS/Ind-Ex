import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule, // HTTP kérésekhez szükséges
    MatInputModule,
    MatButtonModule,
    MatSliderModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatCardModule
  ]
})
export class AdminComponent {
  name: string = ''; // Asszisztens neve
  model: string = ''; // Asszisztens modellje
  instructions: string = ''; // Instructions input
  temperature: number = 1; // Default temperature value
  top_p: number = 1; // Top-p konfiguráció
  selectedFiles: File[] = []; // Selected files


  // Slider configuration
  disabled = false;
  max = 2;
  min = 0.01;
  showTicks = false;
  step = 0.01;
  thumbLabel = false;
  value = 1; // This will be the slider value

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAssistantDetails();
  }

  // Load assistant details from the backend
  loadAssistantDetails() {
    const apiUrl = `${environment.apiUrl}/api/instructions`; // Backend URL
    const token = localStorage.getItem('token'); // Feltételezzük, hogy a token itt van tárolva

    if (!token) {
      console.error('JWT token is missing. Please login again.');
      return;
    }

    interface AssistantDetails {
      name: string;
      model: string;
      instructions: string;
      temperature: number;
      top_p: number;
    }

    this.http.get<AssistantDetails>(apiUrl, { headers: { Authorization: `Bearer ${token}` } }).subscribe(
      (response) => {
        this.name = response.name || '';
        this.model = response.model || '';
        this.instructions = response.instructions || '';
        this.temperature = response.temperature || 1;
        this.top_p = response.top_p || 1;

        console.log('Assistant details loaded:', response);
      },
      (error) => {
        console.error('Failed to load assistant details:', error);
      }
    );
  }



  // File selection handler
  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFiles = Array.from(event.target.files);
    }
  }

  // File upload placeholder (backend not integrated yet)
  uploadFiles() {
    if (this.selectedFiles.length === 0) {
      alert('Please select files to upload.');
    } else {
      console.log('Selected files:', this.selectedFiles);
    }
  }

  // Save settings
  saveSettings() {
    console.log('Instructions:', this.instructions);
    console.log('Temperature:', this.temperature);
    console.log('Selected Files:', this.selectedFiles);

    alert('Settings saved (placeholder for future API integration).');
  }
}