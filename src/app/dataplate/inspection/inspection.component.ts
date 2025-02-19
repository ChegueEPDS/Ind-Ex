import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Fontos az ngModel használatához
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { environment } from '../../../environments/environment';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar } from '@angular/material/snack-bar';

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

@Component({
  selector: 'app-inspection',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // ngModel használata miatt
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltip,
    MatPaginatorModule,
    MatToolbarModule,
    MatSortModule,
    MatSelectModule
  ],
  templateUrl: './inspection.component.html',
  styleUrl: './inspection.component.scss'
})
export class InspectionComponent implements OnInit, AfterViewInit {
  dataSource: MatTableDataSource<any> = new MatTableDataSource<any>([]);
  selection = new SelectionModel<any>(true, []);
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumnsDb = [
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
    'Compliance',
    'Other Info',
  ];

  selectedCertificateDetails: any[] = []; // Tömb az összes sikeres találathoz
  selectedEquipmentId: string = ''; // Kiválasztott Equipment ID
  equipmentList: string[] = []; // EqID értékek tárolása
  selectedRow: any = null;  // Jelenlegi kijelölt sor
  editInProgress: boolean = false; // Jelzi, hogy van-e aktív szerkesztési mód
  complianceOptions: string[] = ['Passed', 'Failed', 'NA']; // Előre definiált értékek
  selectedEnvironment: 'G' | 'D' | 'GD' | 'NA' | ''=''; 
  availableSubgroups: string[] = []; 
  selectedSubgroup: string = ''; // Az aktuális Subgroup értéke
  allSubgroups: { [key in 'G' | 'D' | 'GD' | 'NA' ]: string[] } = {
    NA: ['Non Ex'],
    G: ['IIA', 'IIB', 'IIC'],
    D: ['IIIA', 'IIIB', 'IIIC'],
    GD: ['IIA', 'IIB', 'IIC', 'IIIA', 'IIIB', 'IIIC']
  };
  availableTempclasses: string[] = []; 
  selectedTempclass: string = ''; // Az aktuális Subgroup értéke
  allTempclasses: { [key in 'G' | 'D' | 'GD' | 'NA' ]: string[] } = {
    NA: ['Non Ex'],
    G: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    D: [],
    GD: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']
  };
  selectedMaxTemp: number | null = null;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.loadEquipmentIds();
    this.dataSource.filterPredicate = (data: any, filter: string): boolean => {
      const dataStr = Object.keys(data)
        .reduce((currentTerm, key) => {
          const value = data[key];
          if (typeof value === 'object' && value !== null) {
            return currentTerm + JSON.stringify(value).toLowerCase();
          }
          return currentTerm + (value ?? '').toString().toLowerCase();
        }, '');
      return dataStr.includes(filter);
    };
  }

  ngAfterViewInit() {
    // Initialize paginator and sorter
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadEquipmentIds(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/exreg`).subscribe({
      next: (data) => {
        // Equipment ID-k gyűjtése és egyedi értékek létrehozása
        this.equipmentList = Array.from(
          new Set(data.map(item => item['EqID']).filter(eqId => eqId))
        );
      },
      error: (err) => {
        console.error('Hiba történt az Equipment ID-k lekérésekor:', err);
      }
    });
  }

  loadDataForEquipmentId(): void {
    if (!this.selectedEquipmentId) return;
  
    this.http.get<any[]>(`${environment.apiUrl}/api/exreg`).subscribe({
      next: (data) => {
        // Csak a kiválasztott EqID alapján szűrt adatok
        const filteredData = data
          .filter(item => item['EqID'] === this.selectedEquipmentId)
          .flatMap(item =>
            item['Ex Marking'].map((marking: any) => ({
              Manufacturer: item.Manufacturer,
              "Model/Type": item["Model/Type"],
              "Serial Number": item["Serial Number"],
              "Equipment Type": item["Equipment Type"],
              Marking: marking.Marking,
              "Equipment Group": marking["Equipment Group"],
              "Equipment Category": marking["Equipment Category"],
              Environment: marking.Environment,
              "Type of Protection": marking["Type of Protection"],
              "Gas / Dust Group": marking["Gas / Dust Group"],
              "Temperature Class": marking["Temperature Class"],
              "Equipment Protection Level": marking["Equipment Protection Level"],
              "IP rating": item["IP rating"],
              "Certificate No": item["Certificate No"], // Certificate No hozzáadása
              "Max Ambient Temp": item["Max Ambient Temp"],
              "Compliance": item["Compliance"],
              "Other Info": item["Other Info"],
              "EqID": item["EqID"],
              _id: item._id,
              editMode: false
            }))
          );
  
        this.dataSource.data = filteredData; // Táblázat feltöltése
  
        // Ha van Certificate No, akkor elindítjuk a részletek lekérdezését
        const firstCertNo = filteredData.length > 0 ? filteredData[0]['Certificate No'] : null;
        if (firstCertNo) {
          this.fetchCertificateDetails(firstCertNo);
        }
      },
      error: (err) => {
        console.error('Hiba történt az adatok betöltésekor:', err);
      }
    });
  }
  
  fetchCertificateDetails(certNo: string): void {
    console.log('Keresett Certificate no:', certNo);
  
    // CertNo szétbontása '/' mentén
    const certParts = certNo.split('/').map(part => part.trim());
  
    // Több kérés indítása a szétbontott részekre
    this.selectedCertificateDetails = []; // Reseteljük a találatokat
    certParts.forEach(part => {
      if (part) { // Üres értékek ellenőrzése
        this.http.get<any>(`${environment.apiUrl}/api/certificates/${part}`).subscribe({
          next: (data) => {
            console.log('Backend válasz:', data);
            this.selectedCertificateDetails.push(data); // Hozzáadjuk a találatot a tömbhöz
          },
          error: (err) => {
            console.warn(`Nem található tanúsítvány ezzel a számmal: ${part}`);
          }
        });
      }
    });
  }

  formatSpecCondition(specCondition: string): string[] {
    if (!specCondition) return [];
  
    // Szétválasztás mondatvégi írásjelek alapján, kezelve a "..." mint egységet
    const sentences = specCondition
      .replace(/\.{3}/g, '[ELLIPSIS]') // Ideiglenesen lecseréljük a "..." karakterláncot
      .split(/([.!?])(?=[^\s])/g) // Szétválasztás mondatvégi írásjel után, ha nincs szóköz
      .reduce((result: string[], part: string, index: number) => {
        if (index % 2 === 0) {
          // Páros index: mondatrész
          result.push(part);
        } else {
          // Páratlan index: mondatvégi írásjel
          result[result.length - 1] += part; // Csatoljuk az előző mondathoz
        }
        return result;
      }, [])
      .map(sentence => sentence.replace(/\[ELLIPSIS\]/g, '...')) // Visszaállítjuk a "..." karakterláncot
      .map(sentence => sentence.replace(/\s+/g, ' ').trim()) // Extra szóközök eltávolítása
      .filter(sentence => sentence.length > 0); // Üres részek eltávolítása
  
    return sentences; // Visszaadjuk a formázott mondatok tömbjét
  }
  
  updateSubgroups() {
    if (this.selectedEnvironment === '') {
      this.availableSubgroups = []; // Ha nincs kiválasztva semmi, az opciók üresek
    } else {
      this.availableSubgroups = this.allSubgroups[this.selectedEnvironment];
    }
    this.selectedSubgroup = ''; // Reseteljük az alapértelmezett Subgroup értéket
  }

  updateTempclass() {
    if (this.selectedEnvironment === '') {
      this.availableTempclasses = []; // Ha nincs kiválasztva semmi, az opciók üresek
    } else {
      this.availableTempclasses = this.allTempclasses[this.selectedEnvironment];
    }
    this.selectedTempclass = ''; // Reseteljük az alapértelmezett Subgroup értéket
  }

  selectRow(row: any): void {
  if (this.selection.isSelected(row)) {
    this.selection.deselect(row);
    this.selectedRow = null;
    this.selectedCertificateDetails = []; // Tanúsítvány részleteinek nullázása
  } else {
    this.selection.clear();
    this.selection.select(row);
    this.selectedRow = row;

    const certNo = row['Certificate No'];
    if (certNo) {
      this.fetchCertificateDetails(certNo);
    }
  }
}
  
  getSingleSelectedRow(): any | null {
    const selectedRows = this.selection.selected;
  
    if (selectedRows.length === 0) {
      this.notifyUser('Please select a row to edit.');
      return null;
    }
  
    if (selectedRows.length > 1) {
      this.notifyUser('Only one row can be edited at a time. Please deselect extra rows.');
      return null;
    }
  
    return selectedRows[0];
  }
  
  toggleEditMode(): void {
    const row = this.getSingleSelectedRow();
    if (!row) return;
  
    if (this.editInProgress && !row.editMode) {
      this.notifyUser('Close the current edit before editing another row!');
      return;
    }
  
    // Töröljük az összes korábbi kijelölést
    this.selection.clear();
    this.selection.select(row); // Csak az aktuális sort jelöljük ki
  
    row.editMode = !row.editMode;
  
    if (row.editMode) {
      this.editInProgress = true;
      row._originalData = { ...row }; // Eredeti adat mentése
    }
  }
  
  saveSelectedRow(): void {
    // Keresd meg azt a sort, ami jelenleg szerkesztési módban van
    const rowInEditMode = this.dataSource.data.find(row => row.editMode);
  
    if (rowInEditMode) {
      this.saveRowToDatabase(rowInEditMode);
      this.editInProgress = false;
      rowInEditMode.editMode = false;
    } else {
      this.notifyUser('No row is currently in edit mode.');
    }
  }

  cancelEdit(row: any): void {
    if (row._originalData) {
      Object.assign(row, row._originalData); // Visszaállítjuk az eredeti adatokat
      delete row._originalData; // Töröljük a mentett adatot
    }
    row.editMode = false; // Szerkesztési mód leállítása
    this.editInProgress = false; // Szerkesztési állapot visszaállítása
  }
  
  cancelEditSelectedRow(): void {
    // Keresd meg a szerkesztési módban lévő sort
    const rowInEditMode = this.dataSource.data.find(row => row.editMode);
  
    if (rowInEditMode) {
      this.cancelEdit(rowInEditMode);
      this.editInProgress = false; // Szerkesztési állapot visszaállítása
    } else {
      this.notifyUser('No row is currently in edit mode.');
    }
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.dataSource.data);
    }
  }

  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row`;
  }


  notifyUser(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3000, verticalPosition: 'top' }); // 3 másodpercig látható értesítés
  }

  applyFilter(filter: string | Event) {
    let filterValue: string = '';
  
    if (typeof filter === 'string') {
      filterValue = filter.trim().toLowerCase();
    } else if (filter instanceof Event) {
      const target = filter.target as HTMLInputElement;
      if (target) {
        filterValue = target.value.trim().toLowerCase();
      }
    }
  
    this.dataSource.filter = filterValue;
  
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearSearch(): void {
    this.applyFilter('');
  }

  saveRowToDatabase(row: any): void {
    if (row._originalData) {
      delete row._originalData; // Töröljük a mentett eredeti adatot
    }
  
    const payload = {
      _id: row._id,
      Manufacturer: row.Manufacturer,
      "Model/Type": row["Model/Type"],
      "Serial Number": row["Serial Number"],
      "Equipment Type": row["Equipment Type"],
      "Ex Marking": [
        {
          Marking: row.Marking,
          "Equipment Group": row["Equipment Group"],
          "Equipment Category": row["Equipment Category"],
          Environment: row.Environment,
          "Type of Protection": row["Type of Protection"],
          "Gas / Dust Group": row["Gas / Dust Group"],
          "Temperature Class": row["Temperature Class"],
          "Equipment Protection Level": row["Equipment Protection Level"],
          _id: row._id
        }
      ],
      "IP rating": row["IP rating"],
      "Max Ambient Temp": row["Max Ambient Temp"],
      "Certificate No": row["Certificate No"],
      "Other Info": row["Other Info"],
      Compliance: row.Compliance,
      "EqID": row["EqID"]
    };
  
    this.http.put(`${environment.apiUrl}/api/exreg/${row._id}`, payload).subscribe({
      next: () => {
        this.notifyUser('Changes saved successfully.');
  
        // Reset állapotok
        row.editMode = false;
        this.editInProgress = false;
  
        // Sor kijelölésének törlése
        this.selection.clear();
  
        // Adatok újratöltése
        this.loadDataForEquipmentId();
      },
      error: (err) => {
        console.error('Error saving row:', err);
        this.notifyUser('An error occurred while saving changes.');
      }
    });
  }

  deleteRowFromDatabase(row: any) {
    const confirmed = confirm('Are you sure you want to delete this row?');
    if (confirmed) {
      this.http.delete(`${environment.apiUrl}/api/exreg/${row._id}`).subscribe({
        next: () => {
          console.log('Row successfully deleted.');
          this.loadDataForEquipmentId(); // Refresh the table
        },
        error: (err) => {
          console.error('Error deleting row:', err);
        }
      });
    }
  }

  deleteSelectedRowsFromDatabase(): void {
    const selectedRows = this.selection.selected; // Kiválasztott sorok
    
    if (selectedRows.length === 0) {
      this.notifyUser('No rows selected to delete.');
      return;
    }
  
    const confirmed = confirm(`Are you sure you want to delete ${selectedRows.length} row(s)?`);
    
    if (confirmed) {
      // Törlés párhuzamosan az összes kiválasztott sornál
      const deleteRequests = selectedRows.map(row => 
        this.http.delete(`${environment.apiUrl}/api/exreg/${row._id}`).toPromise()
      );
  
      Promise.all(deleteRequests)
        .then(() => {
          console.log('Selected rows successfully deleted.');
          this.notifyUser(`${selectedRows.length} row(s) deleted successfully.`);
          this.loadDataForEquipmentId(); // Táblázat frissítése
          this.selection.clear(); // Kijelölések törlése
        })
        .catch(err => {
          console.error('Error deleting rows:', err);
          this.notifyUser('An error occurred while deleting rows.');
        });
    }
  }

  getFilteredExportData(): any[] {
    const columnsToExport = [
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
    'Compliance',
    'Other Info'
    ]; // Csak ezek az oszlopok kerülnek exportálásra
  
    // Ha vannak kijelölt sorok, azokat exportáljuk
  const rowsToExport = this.selection.selected.length > 0 
  ? this.selection.selected 
  : this.dataSource.filteredData;

return rowsToExport.map(row =>
  columnsToExport.reduce((acc, key) => {
    acc[key] = row[key];
    return acc;
  }, {} as any)
);
}

exportToExcel(): void {
  const exportData = this.getFilteredExportData(); // Exportálandó adatok
  const headers = this.displayedColumnsDb.slice(1);

  // Munkalap létrehozása JSON-adatokból
  const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });

  // Oszlopszélesség beállítása
  worksheet['!cols'] = headers.map(() => ({ wpx: 150 }));

  // Munkafüzet létrehozása
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Database');

  // Excel fájl generálása
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/octet-stream' });

  // Fájl letöltése
  saveAs(data, 'database.xlsx');
}
  
  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    saveAs(data, `${fileName}.xlsx`);
  }

  shouldHighlight(environment: string): boolean {
    if (this.selectedEnvironment === 'G') {
      return environment === 'D' || environment === ''; // Piros keret, ha D vagy üres
    } else if (this.selectedEnvironment === 'D') {
      return environment === 'G' || environment === ''; // Piros keret, ha G vagy üres
    } else if (this.selectedEnvironment === 'GD') {
      return environment === ''; // Piros keret, ha üres
    }
    return false; // Más esetben nincs kiemelés
  }

  shouldHighlightSubgroup(subgroup: string): boolean {
    if (!this.selectedSubgroup) return false; // Ha nincs kiválasztva subgroup, nincs kiemelés
  
    // A cellában lévő értékeket vesszővel elválasztva listává alakítjuk
    const subgroups = subgroup.split(',').map(s => s.trim()); // Cellák szétválasztása és trimelése
  
    // Ellenőrizzük, hogy csak a kiemelendő értékek között szerepel-e
    if (this.selectedSubgroup === 'IIC') {
      return subgroups.every(sg => ['IIA', 'IIB', 'IIIA', 'IIIB', 'IIIC'].includes(sg));
    } else if (this.selectedSubgroup === 'IIB') {
      return subgroups.every(sg => ['IIA', 'IIIA', 'IIIB', 'IIIC'].includes(sg));
    } else if (this.selectedSubgroup === 'IIA') {
      return subgroups.every(sg => ['IIIA', 'IIIB', 'IIIC'].includes(sg));
    } else if (this.selectedSubgroup === 'IIIC') {
      return subgroups.every(sg => ['IIIA', 'IIIB', 'IIA', 'IIB', 'IIC'].includes(sg));
    } else if (this.selectedSubgroup === 'IIIB') {
      return subgroups.every(sg => ['IIIA', 'IIA', 'IIB', 'IIC'].includes(sg));
    } else if (this.selectedSubgroup === 'IIIA') {
      return subgroups.every(sg => ['IIA', 'IIB', 'IIC'].includes(sg));
    }
    return false; // Más esetben nincs kiemelés
  }

  shouldHighlightC(tempclass: string, selectedTempclass: string, selectedMaxTemp: number): boolean {
    if (!tempclass) return false;
  
    const tempClassRank: { [key: string]: number } = {
      'T1': 1, 'T2': 2, 'T3': 3, 'T4': 4, 'T5': 5, 'T6': 6
    };
  
    // TempClass vizsgálat
    const isTempClassHighlighted = (): boolean => {
      if (!selectedTempclass) return false;
  
      const selectedRank = tempClassRank[selectedTempclass];
      const extractedTemps = tempclass.match(/T\d+/g) || [];
      return extractedTemps.some(temp => {
        const rowRank = tempClassRank[temp];
        return rowRank && rowRank < selectedRank;
      });
    };
  
    // Max Temp vizsgálat
    const isMaxTempHighlighted = (): boolean => {
      const extractedNumbers = tempclass.match(/\d{2,}/g)?.map(Number) || [];
      return extractedNumbers.some(num => num < selectedMaxTemp);
    };
  
    // Bármelyik feltétel igaz, akkor kiemelés
    return isTempClassHighlighted() || isMaxTempHighlighted();
  }

  resetSelectionsOnEnvironmentChange() {
    // Nullázzuk a Subgroup, TempClass, és MaxTemp mezőket
    this.selectedSubgroup = '';
    this.selectedTempclass = '';
    this.selectedMaxTemp = null;
  
    // Frissítjük a lehetőségeket
    this.availableSubgroups = this.selectedEnvironment ? this.allSubgroups[this.selectedEnvironment] : [];
    this.availableTempclasses = this.selectedEnvironment ? this.allTempclasses[this.selectedEnvironment] : [];
  }

  formatMarking(marking: string): string {
    if (!marking) return '-';
    return marking.replace(/\s*\/\s*/g, ' /<br>');
  }
}