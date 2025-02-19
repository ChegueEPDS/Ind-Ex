export interface CountdownSnackbarData {
    message: string;
    countdown: number;
    extendSession: () => void; // A session meghosszabbító metódus típusa
  }