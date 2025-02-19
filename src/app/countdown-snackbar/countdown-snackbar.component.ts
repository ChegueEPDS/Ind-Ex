import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { CountdownSnackbarData } from './countdown-snackbar-data.interface'; // Típus importálása

@Component({
  selector: 'app-countdown-snackbar',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './countdown-snackbar.component.html',
  styleUrls: ['./countdown-snackbar.component.scss'] // Javított név
})
export class CountdownSnackbarComponent {
  countdown: number;

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: CountdownSnackbarData, // Használjuk a típusdefiníciót
    private snackBarRef: MatSnackBarRef<CountdownSnackbarComponent>
  ) {
    this.countdown = data.countdown;
    this.startCountdown();
  }

  startCountdown() {
    const interval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(interval);
        this.snackBarRef.dismiss();
      }
    }, 1000);
  }

  extendSession() {
    this.snackBarRef.dismiss(); // Bezárja a snackbar-t
    this.data.extendSession(); // Meghívja a session meghosszabbító metódust
  }
}