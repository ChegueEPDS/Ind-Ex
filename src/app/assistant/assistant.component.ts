import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatDrawer } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog'; 
import { ChallengeComponent } from '../challenge/challenge.component';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';


interface RecognizedTextResponse {
  recognizedText: string;
}

interface ApiResponse {
  response: string;
}
interface ChatResponse {
  response: string;
}

@Component({
  selector: 'app-assistant',
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSidenavModule,
    MatCardModule,
    MatDividerModule,
    TextFieldModule,
    MatTooltipModule,
    MatMenuModule
  ]
})
export class AssistantComponent implements AfterViewChecked, OnInit {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('drawer') drawer!: MatDrawer;
  @ViewChild('fileInputT') fileInputT!: ElementRef;
  @ViewChild('fileInputAzure') fileInputAzure!: ElementRef;
  @ViewChild('fileInputPhoto') fileInputPhoto!: ElementRef;
  
  // Tulajdonságok
  userMessage: string = '';
  messages: Array<{ role: string; content: string; rating?: number; loading?: boolean; hoveredRating?: number; image?: string | null;}> = [];
  hoveredRating: number = 0;
  conversations: any[] = [];
  threadId: string | null = null;
  errorMessage: string = '';
  loading: boolean = false;
  isMobileView: boolean = false;
  shouldScroll: boolean = true;
  isDrawerOpen: boolean = true;
  isLoggedIn: boolean = false;
  userNickname: string = 'Vendég';
  mode: 'over' | 'side' = 'side'; // Kezdő érték desktopra


  constructor(private http: HttpClient, public dialog: MatDialog, private authService: AuthService, private sanitizer: DomSanitizer, private breakpointObserver: BreakpointObserver) {}

  /*
   * Angular életciklus metódusok
   */
  ngOnInit() {
    this.isLoggedIn = this.authService.isAuthenticated(); // Ellenőrizzük a bejelentkezést
    if (this.isLoggedIn) {
      this.loadUserProfile();
      this.startNewConversation();
      this.loadConversations();
    }
    //MOBIL figyelése és sidebar csukása
    this.breakpointObserver.observe(['(max-width: 768px)']).subscribe(result => {
      this.mode = result.matches ? 'over' : 'side'; // Mobilon "over", más esetben "side"
      this.isMobileView = result.matches; // Beállítjuk, hogy mobil nézetben vagyunk-e
    if (result.matches) {
      this.isDrawerOpen = false; // Mobilon alapértelmezett zárt állapot
    }
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  /*
   * Felhasználói profil betöltése
   */
  loadUserProfile() {
    const token = localStorage.getItem('token');
    
    if (token) {
      const tokenData = this.authService.parseJwt(token);
      const userId = tokenData.userId; // Tokenből származtatjuk az userId-t
    
      if (userId) {
        this.http.get<any>(`${environment.apiUrl}/api/user/${userId}`).subscribe({
          next: (user) => {
            this.userNickname = user.nickname || user.firstName;
          },
          error: () => {
            console.error('Hiba történt a felhasználói profil lekérésekor.');
          }
        });
      } else {
        console.error('Nem található felhasználói azonosító a tokenben.');
      }
    } else {
      console.error('Nem található token a localStorage-ban.');
    }
  }

  /*
   * Beszélgetés kezelése
   */
  startNewConversation() {
    this.http.post<{ threadId: string }>(`${environment.apiUrl}/api/new-conversation`, { userId: 'defaultUser' }).subscribe({
      next: (response) => {
        this.threadId = response.threadId;
        this.messages = [];
        this.errorMessage = '';
        this.loading = false;
        this.loadConversations();
      },
      error: () => {
        this.errorMessage = 'Hiba történt az új beszélgetés indításakor. Próbálja meg később.';
        this.loading = false;
      }
    });
  }

  private loadConversations() {
    this.http.get<any[]>(`${environment.apiUrl}/api/conversations`).subscribe({
      next: (conversations) => {
        this.conversations = conversations
          .filter(conversation => conversation.messages && conversation.messages.length > 0)
          .reverse()
          .map(conversation => {
            if (!conversation.threadId) {
              console.warn('Hiányzó threadId:', conversation);
            }
            return { ...conversation, hovered: false };
          });
      },
      error: () => {
        console.error('Hiba történt a beszélgetések betöltésekor.');
      }
    });
  }

  loadConversation(conversation: any) {
    this.threadId = conversation.threadId;
    this.messages = conversation.messages;
    this.scrollToBottom();
    this.loadConversations();
  }

  deleteConversation(threadId: string, event: Event) {
    event.stopPropagation();
    this.http.delete(`${environment.apiUrl}/api/conversation/${threadId}`).subscribe({
      next: () => {
        this.loadConversations();
        if (this.threadId === threadId) {
          this.messages = [];
          this.threadId = null;
        }
      },
      error: () => {
        console.error('Hiba történt a beszélgetés törlésekor.');
      }
    });
  }

  forwardRecognizedText(recognizedText: string, assistantMessage: any) {
    // Blob URL törlése, ha van kép
    if (assistantMessage.image) {
      URL.revokeObjectURL(assistantMessage.image);  // Töröljük a blob URL-t
    }
  
    // Ha a felismert szöveg üres vagy csak szóközökből áll
    if (!recognizedText || recognizedText.trim() === '') {
      this.errorMessage = 'A felismerés során nem sikerült szöveget nyerni a képből.';
      console.error('Üres szöveg feldolgozása.');
      console.log('Felismerési eredmény:', recognizedText);
      this.loading = false;               // Töltés állapot visszaállítása
      assistantMessage.loading = false;   // Asszisztens üzenet betöltési állapotának visszaállítása
      return;                             // Kilépés a függvényből
    }
  
    // Ha van szöveg, folytatjuk a feldolgozást
    if (!this.threadId) {
      this.errorMessage = 'Nincs megadva szál azonosító.';
      this.loading = false;
      assistantMessage.loading = false;
      return;
    }
  
    // Továbbítjuk a felismert szöveget a backend API-hoz
    const body = { message: recognizedText, threadId: this.threadId };
  
    this.http.post(`${environment.apiUrl}/api/chat`, body, { headers: { 'Content-Type': 'application/json' } })
    
    .subscribe({
      next: (response: any) => {
        if (response && response.html) {
          this.handleApiResponse(response, assistantMessage);  // API válasz kezelése
        } else {
          console.error('Hibás válasz formátum:', response);
          this.errorMessage = 'Hibás válasz érkezett a szervertől.';
          this.loading = false;
          assistantMessage.loading = false;
        }
      },
      error: (error) => {
        this.errorMessage = 'Üzenet küldése sikertelen.';
        console.error('Hiba az üzenetküldés során:', error);
        this.loading = false;
        assistantMessage.loading = false;
      }
    });
  }
  
  /*
   * Menühöz mobil nézetben
  */
  onMenuItemClick(action: string) {
    if (action === 'photo') {
      this.onFileSelectPhoto();
    } else if (action === 'azure') {
      this.onFileSelect();
    }
  }
  
  menuClosed() {
    console.log('A menü bezárult.');
  }

  /*
   * Képfeltöltés
  */

  onFileSelect() {
    if (this.fileInputAzure) {
      this.fileInputAzure.nativeElement.click();
    } else {
      console.error('fileInputAzure is not defined.');
    }
  }
  
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach(file => {
        this.uploadImage(file); // Mindegyik fájlt feltöltjük
      });
    }
  }
  
  uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
  
    // Kép URL generálása a megjelenítéshez (thumbnail)
    const imageUrl = URL.createObjectURL(file);  
    console.log('Generated Image URL:', imageUrl);
    
    // Hozzáadjuk a képet a felhasználói üzenethez (imageUrl átadásával)
    this.addUserMessage('', imageUrl);  // Üres szöveg, de kép URL-t adunk át
  
    // Asszisztens üzenet inicializálása (képet nem adunk hozzá)
    const assistantMessage = this.addAssistantLoadingMessage();
  
    this.loading = true;
    this.shouldScroll = true;
  
    // Képfeltöltés az API-hoz
    this.http.post<RecognizedTextResponse>(`${environment.apiUrl}/api/plate`, formData)
      .subscribe({
        next: (response) => {
          // A felismert szöveget továbbítjuk a forwardRecognizedText függvénnyel
          this.forwardRecognizedText(response.recognizedText, assistantMessage);
        },
        error: () => {
          this.errorMessage = 'Kép feltöltése sikertelen.';
          this.loading = false;
          assistantMessage.loading = false;
        }
      });
  }

  /*
  * Tűzes
  */

  onFileSelectPhoto() {
    if (this.fileInputPhoto) {
      this.fileInputPhoto.nativeElement.click();
    } else {
      console.error('fileInputPhoto is not defined.');
    }
  }
  
  onFileChangePhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadImagePhoto(file);
    }
  }
  
  uploadImagePhoto(file: File) {
    const formData = new FormData();
    formData.append('image', file); // "image" key as expected by Vision Controller
  
    // Generate and display the thumbnail
    const imageUrl = URL.createObjectURL(file);
    this.addUserMessage('', imageUrl);
  
    // Initialize assistant loading message
    const assistantMessage = this.addAssistantLoadingMessage();
    this.loading = true;
    this.shouldScroll = true;
  
    // Call Vision Controller's upload endpoint
    this.http.post<{ status: string; image_url: string }>(`${environment.apiUrl}/api/vision/upload`, formData)
      .subscribe({
        next: (uploadResponse) => {
          if (uploadResponse.status === 'success') {
            const uploadedImageUrl = uploadResponse.image_url; // Received image URL from backend
            this.analyzeImagePhoto(uploadedImageUrl, assistantMessage);
          } else {
            this.handleError('Kép feltöltése sikertelen.', assistantMessage);
          }
        },
        error: () => {
          this.handleError('Kép feltöltése sikertelen.', assistantMessage);
        }
      });
  }

  analyzeImagePhoto(imageUrl: string, assistantMessage: any) {
    const requestBody = {
      image_urls: [imageUrl], // Pass the uploaded image URL
    };
  
    // Call Vision Controller's analyze endpoint
    this.http.post<{ status: string; result: string }>(`${environment.apiUrl}/api/vision/analyze`, requestBody)
      .subscribe({
        next: (analyzeResponse) => {
          if (analyzeResponse.status === 'success') {
            assistantMessage.content = marked(analyzeResponse.result); // Set the analysis result
            assistantMessage.loading = false;
            this.loading = false;
          } else {
            this.handleError('Kép elemzése sikertelen.', assistantMessage);
          }
        },
        error: () => {
          this.handleError('Kép elemzése sikertelen.', assistantMessage);
        }
      });
  }

  private handleError(errorMessage: string, assistantMessage: any) {
    this.errorMessage = errorMessage;
    this.loading = false;
    assistantMessage.loading = false;
  }



  /*
   * Értékelés
   */
  rateAnswer(index: number, rating: number) {
    this.messages[index].rating = rating;
  
    if (this.threadId) {
      this.http.post(`${environment.apiUrl}/api/rate-message`, { threadId: this.threadId, messageIndex: index, rating })
        .subscribe({
          next: () => {
            console.log('Értékelés mentve.');
          },
          error: (err) => {
            console.error('Hiba történt az értékelés mentésekor:', err);
          }
        });
    }
  }

  onStarHoverStart(index: number, star: number) {
    this.messages[index].hoveredRating = star;
    this.shouldScroll = false; 
  }
  
  onStarHoverEnd(index: number) {
    this.messages[index].hoveredRating = 0; // Reseteljük a hoveredRating-et
    this.shouldScroll = false; 
  }
  
  // Ha a beviteli mezőre kattint a felhasználó, ne görgessünk
  onInputFocus() {
    this.shouldScroll = false;
  }

  /*
   * Üzenetkezelés
   */
  sendMessage() {
    if (!this.userMessage.trim()) {
      return;
    }

    if (!this.threadId) {
      this.errorMessage = 'Nincs thread ID megadva.';
      return;
    }

    this.addUserMessage(this.userMessage);
    const assistantMessage = this.addAssistantLoadingMessage();
    this.loading = true;
    this.shouldScroll = true;

    this.callChatApi(this.userMessage, this.threadId).subscribe({
      next: (response: any) => {
        this.handleApiResponse(response, assistantMessage);
        this.loadConversations();
      },
      error: (error) => this.handleApiError(assistantMessage),
    });

    this.userMessage = '';
  }

  private callChatApi(message: string, threadId: string) {
    return this.http.post(`${environment.apiUrl}/api/chat`, { message, threadId });
  }
 
  /*
   * Párbeszéd megnyitása kihívásokhoz
   */
  openChallengeDialog(index: number): void {
    const questionMessage = this.messages.slice(0, index + 1).reverse().find(msg => msg.role === 'user')?.content || '';
    const answerMessage = this.messages[index]?.content || '';
  
    this.dialog.open(ChallengeComponent, {
      width: '1000px',
      data: { 
        lastQuestion: questionMessage,
        lastAnswer: answerMessage,
        threadId: this.threadId,
        messageIndex: index 
      }
    });
  }

  /*
   * Felhasználói felület kezelése
   */
  toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Scroll to bottom failed', err);
    }
  }

  getTruncatedContent(content: string | undefined): string {
    if (content === undefined || content === null) {
      return ''; // Üres stringet adunk vissza, ha a content undefined vagy null
    }
  
    return content.length > 20 ? `${content.substring(0, 20)}...` : content;
  }

  /*
   * Segédfüggvények
   */
  private addUserMessage(content: string, image: string | null = null) {
    this.messages.push({ role: 'user', content, image, hoveredRating: 0 }); // Hozzáadjuk a kép URL-t, ha van
  }
  
  
  private addAssistantLoadingMessage() {
    const assistantMessage = { role: 'assistant', content: '', loading: true, hoveredRating: 0, image: null as string | null }; // Hozzáadjuk az image property-t
    this.messages.push(assistantMessage);
    return assistantMessage;
  }
  
  private handleApiResponse(response: any, assistantMessage: any) {
    assistantMessage.content = this.sanitizer.bypassSecurityTrustHtml(response.html);;
    assistantMessage.loading = false;
    assistantMessage.rating = 0;
    this.loading = false;
    this.shouldScroll = true;
  }

  private handleApiError(assistantMessage: any) {
    this.errorMessage = 'Hiba történt. Próbálja meg később.';
    this.loading = false;
    assistantMessage.loading = false;
  }
}