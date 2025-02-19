import { Component, ElementRef, ViewChild, Inject, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Fontos az ngModel használatához
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { DomSanitizer } from '@angular/platform-browser';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-plate-reader',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatButtonModule
  ],
  templateUrl: './plate-reader.component.html',
  styleUrl: './plate-reader.component.scss'
})
export class PlateReaderComponent {
  @ViewChild('fileInputAzure') fileInputAzure!: ElementRef;
  selectedImageUrl: string | null = null;
  recognizedText: string | null = null;
  loading: boolean = false;
  threadId: string | null = null;
  equipmentData: any = null;    // Eredeti JSON
  tableData: any[] = [];        // Szerkeszthető adatok a táblázathoz
  dbData: any[] = [];           // Adatbázisból betöltött adatok megjelenítéséhez
  selectedRow: any = null;  // Jelenlegi kijelölt sor
  editInProgress: boolean = false; // Jelzi, hogy van-e aktív szerkesztési mód
  complianceOptions: string[] = ['NA', 'Passed', 'Failed']; // Előre definiált értékek
  Zone: string;
  Site: string;
  newEquipment: any = {}; // Az új eszköz adatai
  validations: { [key: string]: string[] } = {
    "Equipment Group": ["I", "II", '-', ""],
    "Equipment Category": ["M1", "M2", "1", "2", "3", '-', ""],
    "Environment": ["G", "D", "GD", ''],
    "Gas / Dust Group": ["IIA", "IIB", "IIC", "IIIA", "IIIB", "IIIC", '-', ""],
    "Equipment Protection Level": ['Ga', 'Gb', 'Gc', 'Da', 'Db', 'Dc', '-', ""],
    "Temperature Class": [],
    "IP rating": [] 
  };
  
  displayedColumns = [
    'EqID',
    'Manufacturer',
    'Model/Type',
    'Serial Number',
    'Equipment Type',
    'Marking',
    'Equipment Group',
    'Equipment Category',
    'Environment',
    'Type of Protection',
    'Gas / Dust Group',
    'Temperature Class',
    'Equipment Protection Level',
    'IP rating',
    'Certificate No',
    'Max Ambient Temp',
    'Other Info',
    'Compliance',
    'Actions'
  ];

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    @Optional() public dialogRef: MatDialogRef<PlateReaderComponent> | null = null,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { Zone: string, Site: string } | null = null
  ) {
    if (data) {
      this.Zone = data.Zone;
      this.Site = data.Site;
    } else {
      console.warn('⚠️ No data provided to PlateReaderComponent. Default values used.');
      this.Zone = '';
      this.Site = '';
    }
  }

  cclose(): void {
    this.dialogRef?.close(); // Elvis operátor használata
  }

  onFileSelect() {
    if (this.selectedImageUrl) {
      URL.revokeObjectURL(this.selectedImageUrl);
      this.selectedImageUrl = null;
      this.loading = true;

    }
    if (this.fileInputAzure) {
      this.fileInputAzure.nativeElement.click();
      this.loading = true;

    }
  }

  onFileChange(event: Event) {
    this.loading = true;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedImageUrl = URL.createObjectURL(file);
      this.uploadImage(file);
    }
  }

  uploadImage(file: File) {
    this.loading = true;
    this.recognizedText = null;
    this.equipmentData = null;
    this.tableData = [];

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ recognizedText: string }>(`${environment.apiUrl}/api/plate`, formData).subscribe({
      next: (response) => {
        this.recognizedText = response.recognizedText;
        this.startNewConversation();
      },
      error: (error) => {
        console.error('Hiba a feldolgozás során:', error);
        this.loading = false;
      }
    });
  }

  startNewConversation() {
    this.http.post<{ threadId: string }>(`${environment.apiUrl}/api/new-conversation`, { userId: 'defaultUser' })
      .subscribe({
        next: (response) => {
          this.threadId = response.threadId;
          if (this.recognizedText) {
            this.forwardRecognizedText(this.recognizedText);
          } else {
            this.loading = false;
            console.error('Nincs felismert szöveg.');
          }
        },
        error: (err) => {
          console.error('Hiba új beszélgetés létrehozásakor:', err);
          this.loading = false;
        }
      });
  }

  forwardRecognizedText(text: string) {
    if (!this.threadId) {
      console.error('Nincs threadId.');
      this.loading = false;
      return;
    }
  
    const body = { message: text, threadId: this.threadId };
  
    this.http.post<{ html: string }>(`${environment.apiUrl}/api/chat`, body).subscribe({
      next: (response) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.html, 'text/html');
        const table = doc.querySelector('table');
        if (!table) {
          console.error('Nincs table elem a válaszban.');
          this.loading = false;
          return;
        }
  
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent?.trim() ?? '');
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        if (rows.length === 0) {
          console.error('Nincsenek adatsorok.');
          this.loading = false;
          return;
        }
  
        const firstRowCells = Array.from(rows[0].querySelectorAll('td')).map(td => td.textContent?.trim() ?? '');
  
        const eqIdIndex = headers.indexOf('EqID');
        const manufacturerIndex = headers.indexOf('Manufacturer');
        const modelIndex = headers.indexOf('Model/Type');
        const serialIndex = headers.indexOf('Serial Number');
        const equipTypeIndex = headers.indexOf('Equipment Type');
        const ipIndex = headers.indexOf('IP Rating');
        const certIndex = headers.indexOf('Certificate No.');
        const maxAmbientIndex = headers.indexOf('Max Ambient Temp');
        const complianceIndex = headers.indexOf('Compliance');
        const otherInfoIndex = headers.indexOf('Other Info');
  
        const markingIndex = headers.indexOf('ATEX / IECEX Marking');
        const equipGroupIndex = headers.indexOf('Equipment Group');
        const equipCategoryIndex = headers.indexOf('Equipment Category');
        const environmentIndex = headers.indexOf('Environment');
        const protectionIndex = headers.indexOf('Type of Protection');
        const gasDustIndex = headers.indexOf('Gas / Dust Group');
        const tempClassIndex = headers.indexOf('Temperature Class / Max. Surface Temperature');
        const eplIndex = headers.indexOf('Equipment Protection Level');
  
        const exMarkings = rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() ?? '');
          return {
            "Marking": cells[markingIndex],
            "Equipment Group": cells[equipGroupIndex],
            "Equipment Category": cells[equipCategoryIndex],
            "Environment": cells[environmentIndex],
            "Type of Protection": cells[protectionIndex],
            "Gas / Dust Group": cells[gasDustIndex],
            "Temperature Class": cells[tempClassIndex],
            "Equipment Protection Level": cells[eplIndex]
          };
        });
  
        this.equipmentData = {
          "EqID": firstRowCells[eqIdIndex],
          "Manufacturer": firstRowCells[manufacturerIndex],
          "Model/Type": firstRowCells[modelIndex],
          "Serial Number": firstRowCells[serialIndex],
          "Equipment Type": firstRowCells[equipTypeIndex] || "-",
          "Ex Marking": exMarkings,
          "IP rating": firstRowCells[ipIndex] || "",
          "Max Ambient Temp": firstRowCells[maxAmbientIndex] || "",
          "Certificate No": firstRowCells[certIndex] || "",
          "X condition": {
            "X": false,
            "Specific": ""
          },
          "Other Info": firstRowCells[otherInfoIndex] || "",
          "Compliance": firstRowCells[complianceIndex]
        };
  
        // tableData előállítása + szerkesztési mód jelző
        this.tableData = this.equipmentData['Ex Marking'].map((mark: any) => {
          return {
            editMode: false,
            "EqID": this.equipmentData["EqID"],
            "Manufacturer": this.equipmentData.Manufacturer,
            "Model/Type": this.equipmentData["Model/Type"],
            "Serial Number": this.equipmentData["Serial Number"],
            "Equipment Type": this.equipmentData["Equipment Type"],
            "Marking": mark.Marking,
            "Equipment Group": mark["Equipment Group"],
            "Equipment Category": mark["Equipment Category"],
            "Environment": mark["Environment"],
            "Type of Protection": mark["Type of Protection"],
            "Gas / Dust Group": mark["Gas / Dust Group"],
            "Temperature Class": mark["Temperature Class"],
            "Equipment Protection Level": mark["Equipment Protection Level"],
            "IP rating": this.equipmentData["IP rating"],
            "Certificate No": this.equipmentData["Certificate No"],
            "Max Ambient Temp": this.equipmentData["Max Ambient Temp"],
            "Other Info": this.equipmentData["Other Info"],
            "Compliance": this.equipmentData["Compliance"]
          };
        });
  
        this.loading = false;
  
        // Beszélgetés törlése
        this.deleteCurrentConversation();
      },
      error: (error) => {
        console.error('Hiba a chat kérés során:', error);
        this.loading = false;
      }
    });
  }

  deleteCurrentConversation() {
    if (!this.threadId) {
      console.error('Nincs aktuális threadId.');
      return;
    }
  
    this.http.delete(`${environment.apiUrl}/api/conversation/${this.threadId}`).subscribe({
      next: () => {
        console.log(`Beszélgetés törölve: ${this.threadId}`);
        this.threadId = null; // Törölje a beszélgetés azonosítóját
      },
      error: (err) => {
        console.error('Hiba történt a beszélgetés törlésekor:', err);
      }
    });
  }

  notifyUser(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3000, verticalPosition: 'top' }); // 3 másodpercig látható értesítés
  }

  toggleEditMode(row: any): void {
    if (row.editMode) {
      return; // Ha már szerkesztési módban van, ne tegyen semmit
    }
  
    if (this.editInProgress) {
      alert('Close the current edit before editing another line!');
      return; // Csak egy sor szerkeszthető egyszerre
    }
  
    row.editMode = true; // Engedélyezi a szerkesztési módot
    this.editInProgress = true;
    row._originalData = { ...row }; // Az eredeti adatokat mentjük
  }
  
  saveTemporaryChanges(row: any): void {
    // 🔍 Ellenőrzi, hogy van-e érvénytelen mező
  const hasInvalidField = Object.keys(this.validations).some(field => row[`isInvalid${field.replace(/\s/g, '')}`]);

  if (hasInvalidField) {
    this.notifyUser('⚠️ Cannot save. Please correct invalid fields first.');
    return; // 🚫 Nem enged menteni
  }
    delete row._originalData; // Töröljük az eredeti adat másolatát
    row.editMode = false; // Kilép a szerkesztési módból
    this.editInProgress = false;
    this.notifyUser('Changes registered'); // Értesítést jelenít meg
  }

  cancelEdit(row: any): void {
    if (row._originalData) {
      Object.assign(row, row._originalData); // Visszaállítjuk az eredeti adatokat
      delete row._originalData; // Töröljük az eredeti adat másolatát
    }
    row.editMode = false; // Kilép a szerkesztési módból
    this.editInProgress = false;
    this.notifyUser('Changes discarded'); // Értesítést jelenít meg
  }

  selectRow(row: any): void {
    // Ha ugyanaz a sor, ne tegyünk semmit
    if (this.selectedRow === row) {
      return;
    }
  
    // Ha van aktív szerkesztés egy másik sorban, kérdezzük meg a mentést
    if (this.editInProgress && this.selectedRow) {
      const confirmed = confirm('All changes will lost. Do you wish to continue?');
      if (confirmed) {
        this.cancelEdit(this.selectedRow); // Mentjük az aktuális sort
        this.editInProgress = false; // Szerkesztési módot lezárjuk
      } else {
        return; // Ha nem akar menteni, maradjon a régi sor
      }
    }
  
    // Új sort kijelölünk
    this.selectedRow = row;
  }
    
  confirmAndDeleteRow(row: any) {
    const confirmed = confirm('Are you sure you want to delete this row?');
    if (confirmed) {
      this.deleteRow(row);
    }
  }

  deleteRow(row: any) {
    const index = this.tableData.indexOf(row);
    if (index > -1) {
      this.tableData.splice(index, 1);
      this.tableData = [...this.tableData]; // új referencia a frissítéshez
    }
  }

  saveEquipment(): void {
    const equipmentData = {
      ...this.newEquipment,
      Zone: this.Zone,
      Site: this.Site
    };

    // Eszköz mentése az API-ba
    this.http.post(`${environment.apiUrl}/api/equipment`, equipmentData).subscribe({
      next: (response) => {
        console.log('✅ Equipment saved:', response);
        this.dialogRef?.close(response); // Visszaküldjük az adatot a szülő komponensnek
      },
      error: (err) => console.error('⚠️ Error saving equipment:', err)
    });
  }


  saveToDatabase() {
    this.loading = true;
  
    // Token kinyerése a localStorage-ból
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token hiányzik.');
      this.snackBar.open('Authorization token missing.', 'Close', { duration: 3000, verticalPosition: 'top' });
      this.loading = false;
      return;
    }
  
    const decodedToken = this.decodeToken(token);
    if (!decodedToken?.userId) {
      console.error('A token nem tartalmaz userId-t:', decodedToken);
      this.snackBar.open('Invalid token: missing user ID.', 'Close', { duration: 3000, verticalPosition: 'top' });
      this.loading = false;
      return;
    }

    if (!decodedToken?.company) {
      console.error('A token nem tartalmaz company-t:', decodedToken);
      this.snackBar.open('Invalid token: missing company.', 'Close', { duration: 3000, verticalPosition: 'top' });
      this.loading = false;
      return;
    }

    // Ellenőrizzük, hogy van-e mentendő adat
    if (!this.equipmentData) {
      console.error('Nincs adat amit menthetnék.');
      this.loading = false;
      return;
    }

    // 📌 **Hozzáadjuk a Zone és Site mezőket a mentendő adatokhoz**
    this.equipmentData.Zone = this.Zone;
    this.equipmentData.Site = this.Site;
    console.log('EQZ', this.equipmentData.Zone)
    console.log('Z', this.Zone)
    console.log('EQs', this.equipmentData.Site)
    console.log('S', this.Site)

    // TableData feldolgozása, ha van adat
    if (this.tableData.length > 0) {
      const first = this.tableData[0];
      this.equipmentData["EqID"] = first["EqID"];
      this.equipmentData.Manufacturer = first["Manufacturer"];
      this.equipmentData["Model/Type"] = first["Model/Type"];
      this.equipmentData["Serial Number"] = first["Serial Number"];
      this.equipmentData["Equipment Type"] = first["Equipment Type"];
      this.equipmentData["IP rating"] = first["IP rating"];
      this.equipmentData["Certificate No"] = first["Certificate No"];
      this.equipmentData["Max Ambient Temp"] = first["Max Ambient Temp"];
      this.equipmentData["Other Info"] = first["Other Info"];
      this.equipmentData["Compliance"] = first["Compliance"];
  
      this.equipmentData["Ex Marking"] = this.tableData.map(row => ({
        "Marking": row["Marking"],
        "Equipment Group": row["Equipment Group"],
        "Equipment Category": row["Equipment Category"],
        "Environment": row["Environment"],
        "Type of Protection": row["Type of Protection"],
        "Gas / Dust Group": row["Gas / Dust Group"],
        "Temperature Class": row["Temperature Class"],
        "Equipment Protection Level": row["Equipment Protection Level"]
      }));
    }

    // CreatedBy és Company mezők beállítása
    this.equipmentData.CreatedBy = decodedToken.userId;
    this.equipmentData.Company = decodedToken.company;

    // 📌 **Mentés az adatbázisba**
    this.http.post(`${environment.apiUrl}/api/exreg`, this.equipmentData)
      .subscribe({
        next: () => {
          console.log('Adatok sikeresen elmentve az adatbázisba.');
          this.snackBar.open('Equipment added to the ExRegister', 'Close', { duration: 3000, verticalPosition: 'top' });
          this.loading = false;
          this.selectedImageUrl = null;
          this.tableData = [];

        },
        error: (err) => {
          console.error('Hiba történt mentéskor:', err);
          this.snackBar.open('Failed to add to the ExRegister', 'Close', { duration: 3000, verticalPosition: 'top' });
          this.loading = false;
        },
      });
}
  
  decodeToken(token: string | null): any {
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
      console.error('Token dekódolása sikertelen:', error);
      return null;
    }
  }

  validateField(row: any, field: string): void {
    if (!this.validations[field] && field !== "IP rating" && field !== "Temperature Class") return;

    const multiValueFields = ["Equipment Protection Level", "Gas / Dust Group", "Temperature Class", "IP rating"];
    let inputValues: string[];

    if (multiValueFields.includes(field)) {
        inputValues = (row[field] || '').split(/[;,|/ ]+/).map((v: string) => v.trim()); 
    } else {
        inputValues = [row[field]];
    }

    let isValid = true;

    // 🔹 Ha minden érték üres vagy "-", akkor automatikusan érvényes
    if (inputValues.every(value => value === "" || value === "-")) {
        isValid = true;
    } else if (field === "IP rating") {
        // 🔹 Az IP mező validációja regex alapján (pl. IP65, IPX7, IP20)
        const ipRegex = /^IP[0-6X][0-9X]$/;
        isValid = inputValues.every(value => ipRegex.test(value));
    } else if (field === "Temperature Class") {
        // 🔥 🔹 Temperature Class validálása (T1-T6, T80, T120, T100°C, stb.)
        const tempRegex = /^T(1|2|3|4|5|6|\d{2,3})(°?C)?$/;
        isValid = inputValues.every(value => tempRegex.test(value));
    } else {
        // 🔹 Egyéb mezők normál validációja az `validations` objektum alapján
        const validValues = this.validations[field];
        isValid = inputValues.every(value => validValues.includes(value));
    }

    // 📌 **Biztosítjuk, hogy az `isInvalid` mező neve helyes legyen**
    const validationKey = `isInvalid${field.replace(/[^a-zA-Z0-9]/g, '')}`;
    row[validationKey] = !isValid;

    if (!isValid) {
        this.notifyUser(`Invalid value(s) for ${field}. Allowed format: ${field === "IP rating" ? "IPXY (e.g. IP65, IPX7)" : field === "Temperature Class" ? "T1-T6, T80, T100°C, etc." : this.validations[field].join(', ')}`);
    }
}
}