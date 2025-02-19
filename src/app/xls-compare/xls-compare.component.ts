import { Component, WritableSignal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatRippleModule } from '@angular/material/core';

@Component({
  selector: 'app-xls-compare',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRippleModule
  ],
  templateUrl: './xls-compare.component.html',
  styleUrls: ['./xls-compare.component.scss']
})
export class XlsCompareComponent {
  file1: WritableSignal<File | null> = signal<File | null>(null);
  file2: WritableSignal<File | null> = signal<File | null>(null);
  columnLetter: WritableSignal<string> = signal<string>('A');
  availableColumns: string[] = [...Array(26)].map((_, i) => String.fromCharCode(65 + i));

  comparisonResult: WritableSignal<string[]> = signal<string[]>([]);
  sanitizedComparisonResult: WritableSignal<SafeHtml[]> = signal<SafeHtml[]>([]);

  downloadUrl: WritableSignal<string | null> = signal<string | null>(null);
  loading: WritableSignal<boolean> = signal<boolean>(false);
  errorMessage: WritableSignal<string | null> = signal<string | null>(null);
  responseReceived: WritableSignal<boolean> = signal<boolean>(false);

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private sanitizer: DomSanitizer) {}

  onFileChange(event: Event, fileNumber: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      fileNumber === 1 ? this.file1.set(input.files[0]) : this.file2.set(input.files[0]);
    }
  }

  compareFiles(): void {
    if (!this.file1() || !this.file2() || !this.columnLetter()) {
      this.snackBar.open('Mindkét fájlt és az azonosító oszlop betűjelét is meg kell adni!', 'Bezárás', { duration: 3000 });
      return;
    }

    this.clearPreviousResults();
    this.loading.set(true);

    const formData = new FormData();
    formData.append('files', this.file1() as File);
    formData.append('files', this.file2() as File);
    formData.append('columnLetter', this.columnLetter());

    this.http.post<{ changes: string[]; fileUrl: string }>(
      `${environment.apiUrl}/api/xls/comparenoai`, formData
    ).subscribe({
      next: (response) => {
        this.processApiResponse(response);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Hiba történt az összehasonlítás során!', 'Bezárás', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  private clearPreviousResults(): void {
    this.comparisonResult.set([]);
    this.sanitizedComparisonResult.set([]);
    this.downloadUrl.set(null);
    this.errorMessage.set(null);
    this.responseReceived.set(false);
  }

  private processApiResponse(response: { changes: string[]; fileUrl: string }): void {
    this.responseReceived.set(true);

    const parsedChanges = response.changes.length > 0
      ? response.changes.map(change => typeof change === "string" ? JSON.parse(change) : change)
      : [];

    this.comparisonResult.set(parsedChanges);

    const groupedChanges = this.groupChangesByStatus(parsedChanges);

    this.sanitizedComparisonResult.set([
      this.formatGroup("🔄 Modified items:", groupedChanges.modified),
      this.formatGroup("✅ New items", groupedChanges.new),
      this.formatGroup("❌ Deleted items", groupedChanges.deleted)
    ]);

    this.downloadUrl.set(response.fileUrl);
}

private groupChangesByStatus(changes: any[]): { modified: any[]; new: any[]; deleted: any[] } {
    return changes.reduce((acc, change) => {
        if (change._status === "new") {
            acc.new.push(change);
        } else if (change._status === "deleted") {
            acc.deleted.push(change);
        } else {
            acc.modified.push(change);
        }
        return acc;
    }, { modified: [], new: [], deleted: [] });
}

private formatGroup(title: string, changes: any[]): SafeHtml {
    if (changes.length === 0) return '';

    const content = changes.map(change => {
        const eqID = `<div style="padding-left: 22px;"> + <strong>EqID:</strong> ${change.EqID}</div>`;
        const details = Object.entries(change)
            .filter(([key]) => key !== "_status" && key !== "EqID")
            .map(([key, value]) => {
                const valueStr = String(value);
                const match = valueStr.match(/(.*) \(régi: (.*)\)/);
                return match
                    ? `<div style="padding-left: 38px;">- <strong>${key}:</strong> ${match[1]} <span style="color:gray;">(régi: ${match[2]})</span></div>`
                    : `<div style="padding-left: 38px;">- <strong>${key}:</strong> ${valueStr}</div>`;
            })
            .join('');
        return `<div style="margin: 8px 0;">${eqID}${details}</div>`;
    }).join('');

    return this.sanitizer.bypassSecurityTrustHtml(
        `<div style="margin-bottom: 10px; padding: 8px; border-left: 4px solid ${this.getBorderColor(title)};">
            <strong>${title}</strong>
            ${content}
        </div>`
    );
}

private getBorderColor(status: string): string {
    return status.includes("Törölt") ? "red" :
           status.includes("Új") ? "green" :
           "orange";
}

downloadXlsx(): void {
  const url = this.downloadUrl();
  if (!url) {
    this.snackBar.open('Nincs elérhető fájl a letöltéshez!', 'Bezárás', { duration: 3000 });
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = 'comparison_result.xlsx'; // Megadható konkrét fájlnév
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
}