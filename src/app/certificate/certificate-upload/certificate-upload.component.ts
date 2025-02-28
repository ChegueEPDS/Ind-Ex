import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { GraphService } from '../../services/graph.service';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AuthService } from '../../services/auth.service';


interface OcrResponse {
  recognizedText: string;
  extractedData?: {
    certificateNumber?: string;
    status?: string;
    issueDate?: string;
    applicant?: string;
    manufacturer?: string;
    equipment?: string;
    exMarking?: string;
    protection?: string;
    specialConditions?: string;
    description?: string;
  };
}

@Component({
  selector: 'app-certificate-upload',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    CommonModule,
    MatIconModule,
    PdfViewerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatButtonToggleModule
  ],
  templateUrl: './certificate-upload.component.html',
  styleUrl: './certificate-upload.component.scss'
})
export class CertificateUploadComponent {
  uploadForm: FormGroup;
  file: File | null = null;
  responseMessage: string | null = null;
  folderName: string = '';
  filePreviewUrl: string | null = null;
  isPdf: boolean = false;
  isLoading: boolean = false;
  isUploading: boolean = false;
  selectedCertType: string = 'IECEx';
  ocrText: string = ''; // 🔹 OCR eredmény tárolására

  constructor(private fb: FormBuilder, private http: HttpClient, private graphService: GraphService, private snackBar: MatSnackBar, private authService: AuthService) {
    this.uploadForm = this.fb.group({
      certNo: ['', Validators.required],
      equipment: [''],
      manufacturer: [''],
      exmarking: [''],
      protection: [''],
      xcondition: [false],
      ucondition: [false],
      specCondition: [''],
      description: [''],
      status: [''],
      issueDate: [''],
      applicant: [''],
      scheme: [''],
    });
  }

  showNotification(message: string, isError: boolean = false) {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: isError ? 'snackbar-error' : 'snackbar-success',
      verticalPosition: 'top',
      horizontalPosition: 'center'
    });
  }

  // 🔹 Fájl kiválasztása és előnézet beállítása
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
      const fileType = this.file.type;
  
      this.uploadForm.reset();
      this.filePreviewUrl = null;
      this.isPdf = false;
  
      if (this.filePreviewUrl) {
        URL.revokeObjectURL(this.filePreviewUrl);
      }
  
      if (fileType === 'application/pdf') {
        this.isPdf = true;
        this.filePreviewUrl = URL.createObjectURL(this.file);
      } else if (fileType.startsWith('image/')) {
        this.isPdf = false;
        const fileReader = new FileReader();
        fileReader.onload = () => {
          this.filePreviewUrl = fileReader.result as string;
        };
        fileReader.readAsDataURL(this.file);
      } else {
        this.filePreviewUrl = null;
        this.isPdf = false;
      }
  
      // ✅ Automatikus OCR beolvasás fájl kiválasztása után
      this.sendToOcr();
      input.value = '';
    }
  }

  // 🔹 Fájl küldése az OCR végpontra
  async sendToOcr() {
    if (!this.file) {
      this.showNotification("❌ Kérlek válassz ki egy fájlt!");
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    formData.append('file', this.file);
    formData.append('certType', this.selectedCertType);

    let endpoint = `${environment.apiUrl}/api/plate`;
    if (this.file.type === 'application/pdf') {
      endpoint = `${environment.apiUrl}/api/pdfcert`;
    }

    try {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${await this.graphService.getAccessToken()}`,
      });

      const response = await this.http.post<OcrResponse>(endpoint, formData, { headers }).toPromise();

      if (response?.extractedData) {
        console.log("✅ OCR sikeres:", response.extractedData);

        this.ocrText = response.recognizedText; // 🔹 OCR szöveg elmentése

        this.uploadForm.patchValue({
          certNo: response.extractedData.certificateNumber || '',
          status: response.extractedData.status || '',
          issueDate: response.extractedData.issueDate || '',
          applicant: response.extractedData.applicant || '',
          manufacturer: response.extractedData.manufacturer || '',
          equipment: response.extractedData.equipment || '',
          exmarking: response.extractedData.exMarking || '',
          protection: response.extractedData.protection || '',
          specCondition: response.extractedData.specialConditions || '',
          description: response.extractedData.description || '',
          xcondition: response.extractedData.certificateNumber
            ? /\bX\b/.test(response.extractedData.certificateNumber) || response.extractedData.certificateNumber.trim().endsWith("X")
            : false,
          ucondition: response.extractedData.certificateNumber
          ? /\bX\b/.test(response.extractedData.certificateNumber) || response.extractedData.certificateNumber.trim().endsWith("U")
          : false,

        });

        this.showNotification('✅ OCR beolvasás sikeres!');
      } else {
        throw new Error("❌ OCR válasz hibás vagy üres.");
      }
    } catch (error) {
      console.error("❌ OCR hiba:", error);
      this.showNotification("❌ OCR feldolgozás sikertelen.");
    } finally {
      this.isLoading = false;
    }
  }

  // 🔹 Fájl feltöltése a szerverre
  async onSubmit() {
    if (!this.file) {
      this.showNotification('❌ Kérlek válassz ki egy fájlt!');
      return;
    }
    this.isUploading = true;
  
    this.uploadForm.patchValue({ scheme: this.selectedCertType });
  
    try {
      const formData = new FormData();
      formData.append("file", this.file);
      formData.append("certNo", this.uploadForm.value.certNo);
      formData.append("status", this.uploadForm.value.status);
      formData.append("issueDate", this.uploadForm.value.issueDate);
      formData.append("applicant", this.uploadForm.value.applicant);
      formData.append("equipment", this.uploadForm.value.equipment);
      formData.append("manufacturer", this.uploadForm.value.manufacturer);
      formData.append("exmarking", this.uploadForm.value.exmarking);
      formData.append("protection", this.uploadForm.value.protection);
      formData.append("xcondition", this.uploadForm.value.xcondition);
      formData.append("specCondition", this.uploadForm.value.specCondition);
      formData.append("description", this.uploadForm.value.description);
      formData.append("ucondition", this.uploadForm.value.ucondition);
      formData.append("scheme", this.uploadForm.value.scheme);
      formData.append("recognizedText", this.ocrText); // 🔹 OCR eredmény hozzáadása
  
      // 🔹 User ID hozzáadása
      const userId = this.authService.getUserId();
      if (userId) {
        formData.append("userId", userId);
      }
  
      const headers = new HttpHeaders({
        Authorization: `Bearer ${await this.graphService.getAccessToken()}`,
      });
  
      const response = await this.http.post(`${environment.apiUrl}/api/certificates/upload`, formData, { headers }).toPromise();
  
      if (response) {
        console.log("✅ Fájl sikeresen feltöltve:", response);
        this.showNotification("✅ Feltöltés sikeres!");
        this.uploadForm.reset();
        this.file = null;
        this.filePreviewUrl = null;
        this.isPdf = false;
        this.isUploading = false;
      } else {
        throw new Error("❌ Feltöltési hiba.");
      }
    } catch (error) {
      console.error("❌ Feltöltési hiba:", error);
      this.showNotification("❌ Feltöltés sikertelen.");
      this.isUploading = false;
    }
  }
}