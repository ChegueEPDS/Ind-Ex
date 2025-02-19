import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-certificate-upload',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    CommonModule
  ],
  templateUrl: './certificate-upload.component.html',
  styleUrl: './certificate-upload.component.scss'
})
export class CertificateUploadComponent {
  uploadForm: FormGroup;
  file: File | null = null;
  responseMessage: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.uploadForm = this.fb.group({
      certNo: ['', Validators.required],
      xcondition: [false],
      specCondition: ['']
    });
  }

  // Fájl kiválasztása
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
    }
  }

  // Feltöltés elküldése
  onSubmit() {
    if (!this.file) {
      this.responseMessage = 'Kérlek válassz ki egy fájlt!';
      return;
    }

    const formData = new FormData();
    formData.append('file', this.file);
    formData.append('certNo', this.uploadForm.value.certNo);
    formData.append('xcondition', this.uploadForm.value.xcondition);
    formData.append('specCondition', this.uploadForm.value.specCondition);

    this.http.post(`${environment.apiUrl}/api/certificates/upload`, formData).subscribe({
      next: (res: any) => {
        this.responseMessage = 'Feltöltés sikeres! URL: ' + res.fileUrl;
        this.uploadForm.reset();
        this.file = null;
      },
      error: (err) => {
        console.error(err);
        this.responseMessage = 'Hiba történt a feltöltés során.';
      }
    });
  }
}