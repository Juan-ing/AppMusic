import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import type { ChatMessage } from '../../models/music.model';
import type { Unsubscribe } from 'firebase/firestore';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [DatePipe, FormsModule, NgFor, NgIf],
  templateUrl: './chat.component.html',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageList') private messageList?: ElementRef<HTMLElement>;
  readonly roomId = 'lobby';
  messages: ChatMessage[] = [];
  text = '';
  error = '';
  private unsubscribe?: Unsubscribe;
  private previousLastMessageId = '';

  constructor(readonly auth: AuthService, private readonly chat: ChatService) {}

  ngOnInit(): void {
    this.unsubscribe = this.chat.listen(
      this.roomId,
      (messages) => {
        this.messages = messages;
      },
      () => (this.error = 'No se pudo conectar al chat en tiempo real.'),
    );
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }

  ngAfterViewChecked(): void {
    const lastMessageId = this.messages[this.messages.length - 1]?.id ?? '';
    if (lastMessageId === this.previousLastMessageId) return;
    this.previousLastMessageId = lastMessageId;
    const element = this.messageList?.nativeElement;
    if (element) element.scrollTop = element.scrollHeight;
  }

  async send(): Promise<void> {
    const user = this.auth.profile();
    if (!user) {
      this.error = 'No pudimos cargar tu perfil para enviar mensajes.';
      return;
    }
    if (!this.text.trim()) return;
    this.error = '';
    try {
      await this.chat.send(this.roomId, user, this.text);
      this.text = '';
    } catch {
      this.error = 'No se pudo enviar el mensaje.';
    }
  }

  isOwnMessage(message: ChatMessage): boolean {
    return message.userId === this.auth.user()?.uid;
  }
}
