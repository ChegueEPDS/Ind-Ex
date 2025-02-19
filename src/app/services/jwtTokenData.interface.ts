export interface JwtTokenData {
    exp: number; // Token lejárati idő
    userId?: string; // Felhasználói azonosító
    role?: string; // Felhasználói szerepkör
    [key: string]: any; // Egyéb mezők
  }