import { Component, OnInit, ViewChild, AfterViewInit, Input, EventEmitter, Output } from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar } from '@angular/material/snack-bar';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { environment } from '../../../environments/environment';
import { AssignToProjectDialogComponent } from '../../assign-to-project-dialog/assign-to-project-dialog.component'

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

@Component({
  selector: 'app-database',
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
    MatCheckboxModule,
    MatSortModule,
    MatSelectModule
  ],
  templateUrl: './database.component.html',
  styleUrls: ['./database.component.scss']
})

export class DatabaseComponent implements OnInit, AfterViewInit {
  @Input() zoneId?: string;
  @Output() dataChanged = new EventEmitter<void>();
  @Output() deletionCompleted = new EventEmitter<void>();
  dataSource: MatTableDataSource<any> = new MatTableDataSource<any>([]);
  selection = new SelectionModel<any>(true, []);
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumnsDb = [
    'select',
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
  validations: { [key: string]: string[] } = {
    "Equipment Group": ["I", "II"],
    "Equipment Category": ["M1", "M2", "1", "2", "3"],
    "Environment": ["G", "D", "GD", ''],
    "Gas / Dust Group": ["IIA", "IIB", "IIC", "IIIA", "IIIB", "IIIC"],
    "Equipment Protection Level": ['Ga', 'Gb', 'Gc', 'Da', 'Db', 'Dc',],
    "Temperature Class": [],
    "IP rating": [] 
  };

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  openAssignToProjectDialog(): void {
    const selectedRow = this.selection.selected[0]; // Csak az első kijelölt sor
    if (!selectedRow) {
      this.notifyUser('Please select a row to assign.');
      return;
    }
  
    const sitesRequest = this.http.get<any[]>(`${environment.apiUrl}/api/sites`);
    const zonesRequest = this.http.get<any[]>(`${environment.apiUrl}/api/zones`);
  
    Promise.all([sitesRequest.toPromise(), zonesRequest.toPromise()])
      .then(([sites, zones]) => {
        console.log('Lekérdezett Site-ok:', sites);
        console.log('Lekérdezett Zone-ok:', zones);
  
        const dialogRef = this.dialog.open(AssignToProjectDialogComponent, {
          width: '400px',
          data: {
            sites,
            zones,
            currentSiteId: selectedRow.Site || null,  // Jelenlegi Site ID
            currentZoneId: selectedRow.Zone || null  // Jelenlegi Zone ID
          }
        });
  
        dialogRef.afterClosed().subscribe((selectedData) => {
          console.log('Kiválasztott adatok:', selectedData);
          if (selectedData) {
            this.assignSelectedRowsToProject(selectedData.siteId, selectedData.zoneId);
          }
        });
      })
      .catch((err) => {
        console.error('Hiba történt a site és zone adatok lekérésekor:', err);
        this.notifyUser('Nem sikerült lekérdezni a site és zone adatokat.');
      });
  }
  
  assignSelectedRowsToProject(siteId: string | null, zoneId: string | null): void {
    const selectedRows = this.selection.selected;

    if (selectedRows.length === 0) {
      this.notifyUser('Nincs kijelölt sor a hozzárendeléshez.');
      return;
    }

    const updateRequests = selectedRows.map((row) => {
      const payload = { 
        ...row, 
        Site: siteId === 'null' ? null : siteId, 
        Zone: zoneId === 'null' ? null : zoneId 
      };
      return this.http.put(`${environment.apiUrl}/api/exreg/${row._id}`, payload).toPromise();
    });

    Promise.all(updateRequests)
      .then(() => {
        this.notifyUser(
          zoneId
            ? 'A kiválasztott sorok sikeresen hozzárendelésre kerültek az új Site és Zone-hoz.'
            : 'A kiválasztott sorok Site és Zone hozzárendelése törlésre került.'
        );

        // 🟢 AZ EREDETI zoneId SZERINT FRISSÍTJÜK A TÁBLÁZATOT
        setTimeout(() => {
          this.loadFromDatabase(this.zoneId); // Mindig az eredeti zoneId marad
          this.dataSource._updateChangeSubscription();
        }, 500); // Késleltetés az adatok betöltéséhez

        // Kijelölések törlése
        this.selection.clear();
      })
      .catch((err) => {
        console.error('Hiba történt a sorok hozzárendelése során:', err);
        this.notifyUser('Hiba történt a hozzárendelés során.');
      });
}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data: any, filter: string): boolean => {
      const dataStr = Object.keys(data)
        .reduce((currentTerm, key) => {
          const value = data[key];
          return currentTerm + (value ?? '').toString().toLowerCase();
        }, '');
      return dataStr.includes(filter);
    };
  
    if (this.zoneId) {
      console.log(`Project ID detected: ${this.zoneId}`);
      // Töltsd be a projekt részleteit a Zone requirements-hez
      this.loadProjectDetails(this.zoneId);
  
      // Töltsd be a táblázathoz szükséges adatokat
      this.loadFromDatabase(this.zoneId);
    } else {
      console.log('No Project ID provided, loading only items where Project is NULL.');
      // Csak azokat az adatokat töltjük be, ahol a Project mező NULL
      this.loadFromDatabase(null);
    }
  }

  ngAfterViewInit() {
    // Initialize paginator and sorter
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  onEnvironmentChange() {
    // Reseteljük és frissítjük az elérhető opciókat
    this.selectedSubgroup = '';
    this.selectedTempclass = '';
    this.selectedMaxTemp = null;
  
    this.updateSubgroups();
    this.updateTempclass();
  }
  
  updateSubgroups() {
    if (!this.selectedEnvironment || this.selectedEnvironment === 'NA') {
      this.availableSubgroups = []; // Ha nincs kiválasztva környezet, az opciók üresek
    } else {
      this.availableSubgroups = this.allSubgroups[this.selectedEnvironment] || [];
  
      // Ellenőrizzük, hogy a selectedSubgroup érvényes-e
      if (!this.availableSubgroups || !this.availableSubgroups.includes(this.selectedSubgroup)) {
        this.selectedSubgroup = ''; // Reseteljük csak akkor, ha érvénytelen
      }
    }
  }
  
  updateTempclass() {
    if (!this.selectedEnvironment || this.selectedEnvironment === 'NA') {
      this.availableTempclasses = []; // Ha nincs kiválasztva környezet, az opciók üresek
    } else {
      this.availableTempclasses = this.allTempclasses[this.selectedEnvironment] || [];
  
      // Ellenőrizzük, hogy a selectedTempclass érvényes-e
      if (!this.availableTempclasses || !this.availableTempclasses.includes(this.selectedTempclass)) {
        this.selectedTempclass = ''; // Reseteljük csak akkor, ha érvénytelen
      }
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
  
  saveRow(): void {
      // Find the row that is currently in edit mode
      const rowInEditMode = this.dataSource.data.find(row => row.editMode);
      if (!rowInEditMode) {
          this.notifyUser('No row is currently in edit mode.');
          return;
      }

      // Validate all fields before saving
      Object.keys(this.validations).forEach(field => this.validateField(rowInEditMode, field));

      // Check if any field is invalid
      if (Object.keys(this.validations).some(field => rowInEditMode[`isInvalid${field.replace(/\s/g, '')}`])) {
          this.notifyUser('Error: Please correct the invalid fields before saving.');
          return;
      }

      // Remove any temporary original data
      if (rowInEditMode._originalData) {
          delete rowInEditMode._originalData;
      }

      // Prepare the payload for saving
      const payload = {
          _id: rowInEditMode._id,
          Manufacturer: rowInEditMode.Manufacturer,
          "Model/Type": rowInEditMode["Model/Type"],
          "Serial Number": rowInEditMode["Serial Number"],
          "Equipment Type": rowInEditMode["Equipment Type"],
          "Ex Marking": [
              {
                  Marking: rowInEditMode.Marking,
                  "Equipment Group": rowInEditMode["Equipment Group"], 
                  "Equipment Category": rowInEditMode["Equipment Category"],
                  Environment: rowInEditMode.Environment,
                  "Type of Protection": rowInEditMode["Type of Protection"],
                  "Gas / Dust Group": rowInEditMode["Gas / Dust Group"],
                  "Temperature Class": rowInEditMode["Temperature Class"],
                  "Equipment Protection Level": rowInEditMode["Equipment Protection Level"],
                  _id: rowInEditMode._id
              }
          ],
          "IP rating": rowInEditMode["IP rating"],
          "Max Ambient Temp": rowInEditMode["Max Ambient Temp"],
          "Certificate No": rowInEditMode["Certificate No"],
          "Other Info": rowInEditMode["Other Info"],
          Compliance: rowInEditMode.Compliance,
          "EqID": rowInEditMode["EqID"]
      };

      // Send the update request to the server
      this.http.put(`${environment.apiUrl}/api/exreg/${rowInEditMode._id}`, payload).subscribe({
          next: () => {
              this.notifyUser('✅ Changes saved successfully.');
              rowInEditMode.editMode = false;
              this.editInProgress = false;

              // 🔥 Emit the event to notify the parent component that data has changed
              this.dataChanged.emit();

              // 🔄 Update local data to reflect the saved changes
              const index = this.dataSource.data.findIndex((item) => item._id === rowInEditMode._id);
              if (index !== -1) {
                  this.dataSource.data[index] = { ...rowInEditMode };
              }

              // Refresh the Angular Material table
              this.dataSource._updateChangeSubscription();

              // Clear the selection
              this.selection.clear();
          },
          error: (err) => {
              console.error('❌ Error saving row:', err);
              this.notifyUser('⚠️ An error occurred while saving changes.');
          }
      });
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

  /*deleteRowFromDatabase(row: any) {
    const confirmed = confirm('Are you sure you want to delete this row?');
    if (confirmed) {
      this.http.delete(`${environment.apiUrl}/api/exreg/${row._id}`).subscribe({
        next: () => {
          console.log('Row successfully deleted.');
          this.loadFromDatabase(); // Refresh the table
        },
        error: (err) => {
          console.error('Error deleting row:', err);
        }
      });
    }
  }*/

  deleteSelectedRowsFromDatabase(): void {
  const selectedRows = this.selection.selected;

  if (selectedRows.length === 0) {
    this.notifyUser('No rows selected to delete.');
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete ${selectedRows.length} row(s)?`);

  if (confirmed) {
    const deleteRequests = selectedRows.map(row =>
      this.http.delete(`${environment.apiUrl}/api/exreg/${row._id}`).toPromise()
    );

    Promise.all(deleteRequests)
      .then(() => {
        console.log('Selected rows successfully deleted.');
        this.notifyUser(`${selectedRows.length} row(s) deleted successfully.`);
        this.selection.clear();

        // 🟢 FRISSÍTÉS AZ EREDETI `zoneId` ALAPJÁN
        setTimeout(() => {
          this.loadFromDatabase(this.zoneId); // Mindig az eredeti zoneId marad
          this.dataSource._updateChangeSubscription();
        }, 500);

        // 📢 Esemény kibocsátása más komponensek értesítésére
        this.deletionCompleted.emit();
      })
      .catch(err => {
        console.error('Error deleting rows:', err);
        this.notifyUser('An error occurred while deleting rows.');
      });
    }
  }

  loadProjectDetails(zoneId: string): void {
    const url = `${environment.apiUrl}/api/zones/${zoneId}`;
  
    this.http.get<any>(url).subscribe({
      next: (projectData) => {
        console.log('Loaded project details:', projectData);
  
        // Frissítsd a "Zone requirements" mezőket
        this.selectedEnvironment = projectData.Environment || '';
        this.selectedSubgroup = Array.isArray(projectData.SubGroup) && projectData.SubGroup.length > 0
        ? projectData.SubGroup[0] 
        : '';
        this.selectedMaxTemp = projectData.MaxTemp || null;
        this.selectedTempclass = projectData.TempClass || null;
  
        // Frissítsd az elérhető mezőket
       // this.updateTempclass();
      },
      error: (err) => {
        console.error('Error loading project details:', err);
      }
    });
  } 

  loadFromDatabase(zoneId?: string | null): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token missing.');
      return;
    }
  
    let url = `${environment.apiUrl}/api/exreg`;
  
    if (zoneId) {
      url += `?Zone=${zoneId}`;
    } else {
      url += `?noZone=true`; // 🔹 Csak a Zone nélküli eszközök lekérdezése
    }
  
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        console.log('Lekérdezett adatok:', data); // 🔍 Debug
        const processedData = data.flatMap(item =>
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
            "Certificate No": item["Certificate No"],
            "Max Ambient Temp": item["Max Ambient Temp"],
            "Compliance": item["Compliance"],
            "Other Info": item["Other Info"],
            "EqID": item["EqID"],
            "CreatedBy": item.CreatedBy?.nickname || 'Unknown',
            "ModifiedBy": item.ModifiedBy?.nickname || 'Not modified',
            "Site": item.Site || null, // 🛠️ Ellenőrizzük, hogy van-e Site adat
            "Zone": item.Zone || null, // 🛠️ Ellenőrizzük, hogy van-e Zone adat
            _id: item._id,
            editMode: false
          }))
        );

        console.log('Processed Data:', processedData); // 🔍 Debug
        this.dataSource.data = processedData;
      },
      error: (err) => {
        console.error('Error loading data:', err);
      }
    });
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
    const headers = this.displayedColumnsDb.slice(1); // Az oszlopok fejlécei

    // Munkafüzet és munkalap létrehozása
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Database');

    // Fejléc hozzáadása
    worksheet.columns = headers.map((header) => ({
      header: header, // Fejléc neve
      key: header,    // Kulcs a JSON-ból
      width: 10,      // Alapértelmezett szélesség, amit később felülírunk
    }));

    // Fejléc formázása
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FCB040' } }; // Narancssárga szöveg
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2E2109' }, // Sötétszürke háttér
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Középre igazítás
    });

    // Adatok hozzáadása és formázása
    exportData.forEach((rowData) => {
      const row = worksheet.addRow(rowData);

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];

        // Compliance oszlop formázása
        if (header === 'Compliance') {
          const complianceValue = rowData[header];
          const complianceColor =
            complianceValue === 'Passed'
              ? 'FF008000' // Zöld
              : complianceValue === 'Failed'
              ? 'FFFF0000' // Piros
              : 'FF000000'; // Fekete

          cell.font = { color: { argb: complianceColor } }; // Szín alkalmazása
        }

        // Csak G, H, I, J, K, L, M, N oszlopok középre igazítása
        const centerAlignedColumns = ['Equipment Group', 'Equipment Category', 'Environment', 'Type of Protection', 'Gas / Dust Group', 'Temperature Class', 'Equipment Protection Level', 'IP rating'];
        if (centerAlignedColumns.includes(header)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          // Egyéb oszlopok balra igazítása
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Dinamikus oszlopszélesség beállítása
    worksheet.columns?.forEach((column) => {
      if (!column || !column.eachCell) {
        console.warn('Skipping undefined column or missing eachCell method');
        return;
      }
    
      let maxLength = 5; // Minimális szélesség
      column.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.value) {
          const cellLength = cell.value.toString().length;
          maxLength = Math.max(maxLength, cellLength);
        }
      });
    
      column.width = maxLength +2; // Extra hely
    });

    // Fájl generálása és letöltése
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      saveAs(blob, 'exregister.xlsx');
    });
  } 
    
  normalizeEnvironment(value: string): string {
    if (!value) return '';
    const v = value.toLowerCase();
    if (v === 'gas' || v === 'g') {
      return 'Gas';
    }
    if (v === 'dust' || v === 'd') {
      return 'Dust';
    }
    if (v === 'hybrid' || v === 'gd') {
      return 'Hybrid';
    }
    return value;
  }

  shouldHighlight(environment: string): boolean {
    const normalizedSelected = this.normalizeEnvironment(this.selectedEnvironment);
    const normalizedEnv = this.normalizeEnvironment(environment);

    if (normalizedSelected === 'Gas') {
      return normalizedEnv === 'Dust' || normalizedEnv === '';
    } else if (normalizedSelected === 'Dust') {
      return normalizedEnv === 'Gas' || normalizedEnv === '';
    } else if (normalizedSelected === 'Hybrid') {
      return normalizedEnv === '';
    }
    return false;
  }

  shouldHighlightSubgroup(subgroup: string | string[]): boolean {
    if (!this.selectedSubgroup) return false; // Ha nincs kiválasztva subgroup, nincs kiemelés

    // Ha a subgroup tömbként érkezik, alakítsuk át stringgé
    const subgroupString = Array.isArray(subgroup) ? subgroup.join(', ') : subgroup;

    // A cellában lévő értékeket vesszővel elválasztva listává alakítjuk
    const subgroups = subgroupString.split(',').map(s => s.trim());

    // Definiáljuk a megfelelő csoportokat
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
    return false;

  }

  shouldHighlightC(tempclass: string, selectedTempclass: string, selectedMaxTemp: number): boolean {
    if (!tempclass) return false;

    const tempClassRank: { [key: string]: number } = {
      'T1': 6, 'T2': 5, 'T3': 4, 'T4': 3, 'T5': 2, 'T6': 1
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