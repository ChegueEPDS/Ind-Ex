import { Component, ElementRef, ViewChild, Signal, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgIf } from '@angular/common';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-image-analysis',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, NgIf, MatDivider, MatIconModule],
  templateUrl: './image-analysis.component.html',
  styleUrls: ['./image-analysis.component.scss']
})
export class ImageAnalysisComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  imageUrl: WritableSignal<string | null> = signal(null);
  resultData: WritableSignal<string[]> = signal([]);
  visionResponse: WritableSignal<string | null> = signal(null);
  loading: WritableSignal<boolean> = signal(false);
  prompt: string = 'A képen látható tárgy egy mm papíron van elhelyezve, négy információt adj és semmi mást! Milyen tárgy van a képen? Mekkora a tárgy mérete (szélesség x hosszűság)? És milyen típusú? (Ha csap vagy csavar, cső, akkor a típus a szabbványos termékméreteket jelenti pl 1 colos, m6 csavar 60mm, stb.), és Egyéb: a tárgyon láthaó szöveg vagy felismert tárgy alapján fontos információk röviden. A választ html formátumban add vissza a címszavak: ikonok és cím 🛠️ Tárgy:, 📐 Méret, 🏷️ Típus, ➕ Egyéb legyenek félkövérek és ne használj lista elemeket <p> elemek legyenek';

  constructor(private http: HttpClient) {}

  onFileChange(event: any) {
    const file = event.target.files[0];

    if (file) {
        // Ellenőrizzük a fájl méretét (max. 5MB)
       /* if (file.size > 5 * 1024 * 1024) {
            alert('A fájl mérete meghaladja az 5MB-ot. Kérlek, tölts fel kisebb képet.');
            return;
        } */

        // Korábbi eredmények törlése
        this.visionResponse.set(null); 
        this.imageUrl.set(null); 

        // Feltöltés megkezdése
        this.uploadImage(file);
    }
}

  uploadImage(file: File) {
    this.loading.set(true);
    const formData = new FormData();
    formData.append('image', file);

    this.http.post<{ status: string; image_url: string }>(`${environment.apiUrl}/api/vision/upload`, formData).subscribe(
      (response) => {
        this.imageUrl.set(response.image_url);
        this.analyzeImage(response.image_url, this.prompt);
      },
      () => {
        this.loading.set(false);
      }
    );
  }
  
  analyzeImage(imageUrl: string, prompt: string) {
    this.http.post<{ status: string; result: string }>(`${environment.apiUrl}/api/vision/analyze`, { image_urls: [imageUrl], user_input: prompt }).subscribe(
      (response) => {
        this.visionResponse.set(response.result);
      },
      () => {
        this.visionResponse.set('Hiba történt az elemzés során.');
      },
      () => {
        this.loading.set(false);
      }
    );
  }

  getCleanedHtml(result: string): string {
    return result.replace(/```html|```/g, '').trim();
  }
}
