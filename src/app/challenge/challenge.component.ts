import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms'; 
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; 
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-challenge',
  templateUrl: './challenge.component.html',
  styleUrls: ['./challenge.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    CommonModule
  ]
})
export class ChallengeComponent {
  feedback: string = '';
  references: string = '';

  isExpanded: boolean = false;
  contentHeight: string = '100px';

  @ViewChild('answerContent') answerContent!: ElementRef;

  constructor(
    public dialogRef: MatDialogRef<ChallengeComponent>,
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: { threadId: string, messageIndex: number, lastQuestion: string, lastAnswer: string }
  ) {}

  closeDialog(): void {
    this.dialogRef.close();
  }

  toggleExpand(): void {
    if (!this.isExpanded) {
      const contentElement = this.answerContent.nativeElement;
      this.contentHeight = contentElement.scrollHeight + 'px';
    } else {
      this.contentHeight = '100px';
    }
    this.isExpanded = !this.isExpanded;
  }

  submitChallenge(): void {
    const feedbackData = {
      threadId: this.data.threadId,
      messageIndex: this.data.messageIndex,
      comment: this.feedback,
      references: this.references
    };

    this.http.post(`${environment.apiUrl}/api/save-feedback`, feedbackData).subscribe({
      next: () => {
        console.log('Visszajelzés mentve.');
        this.dialogRef.close();
      },
      error: (err) => {
        console.error('Hiba történt a visszajelzés mentése során:', err);
      }
    });
  }
}