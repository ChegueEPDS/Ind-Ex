import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../environments/environment';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-newsite',
  standalone: true,
  imports: [
    MatButtonModule,
    ReactiveFormsModule,
    CommonModule,
    MatFormFieldModule,
    MatOptionModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule
  ],
  templateUrl: './newsite.component.html',
  styleUrl: './newsite.component.scss'
})
export class NewsiteComponent {projectForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<NewsiteComponent>
  ) {
    this.projectForm = this.fb.group({
      Name: ['', [Validators.required]], 
      Client: ['', [Validators.required]], 
    });
  }

 /* decodeToken(token: string | null): any {
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])); // JWT dekódolás
    } catch (error) {
      console.error('Token dekódolása sikertelen:', error);
      return null;
    }
  }
*/
  onSubmit(): void {
    if (this.projectForm.valid) {
      const token = localStorage.getItem('token');
      if (!token) {
        this.snackBar.open('Authorization token missing.', 'Close', { duration: 3000 });
        return;
      }
  
      const projectData = {
        Name: this.projectForm.value.Name,
        Client: this.projectForm.value.Client
      };
  
      this.http.post(`${environment.apiUrl}/api/sites`, projectData).subscribe({
        next: () => {
          this.snackBar.open('Project successfully created!', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Failed to create project.', 'Close', { duration: 3000 });
        },
      });
    } else {
      this.snackBar.open('Please fill out all required fields correctly.', 'Close', { duration: 3000 });
    }
  }

  // Getter az Environment mező egyszerű eléréséhez
  get environment() {
    return this.projectForm.get('Environment')?.value;
  }
}
