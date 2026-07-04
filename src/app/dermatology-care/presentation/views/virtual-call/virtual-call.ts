import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { DermatologyCareStore } from '../../../application/dermatology-care.store';

interface CallMessage {
  id: number;
  from: 'doctor' | 'patient';
  text: string;
  time: string;
}

@Component({
  selector: 'app-virtual-call',
  imports: [MatIconModule, FormsModule, TranslatePipe],
  templateUrl: './virtual-call.html',
  styleUrl: './virtual-call.css',
})
export class VirtualCall implements OnInit, OnDestroy {
  readonly store = inject(DermatologyCareStore);
  protected router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  showEndModal = signal<boolean>(false);
  showChat = signal<boolean>(true);
  callDuration = signal<string>('00:00');

  inputText = '';
  messages = signal<CallMessage[]>([]);

  readonly wherebyUrl: SafeResourceUrl;

  private nextId = 1;
  private timerSeconds = 0;
  private timerInterval?: ReturnType<typeof setInterval>;

  readonly doctorProfile = computed(() => {
    const appt = this.store.selectedAppointment();
    if (!appt) return undefined;
    return this.store
      .dermatologistProfiles()
      .find((p) => p.id === appt.dermatologistId || p.userId === appt.dermatologistId);
  });

  readonly doctorDisplayName = computed((): string => {
    const p = this.doctorProfile();
    if (!p) return 'Dermatologist';
    return p.fullName ? `Dr. ${p.fullName}` : p.specialty;
  });

  readonly doctorInitials = computed((): string => {
    const p = this.doctorProfile();
    if (!p) return 'Dr';
    const source = p.fullName || p.specialty;
    return source
      .split(' ')
      .map((w: string) => w[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  constructor() {
    this.wherebyUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://bloomie-derma.daily.co/bloomie-consultation',
    );
  }

  ngOnInit(): void {
    this.startTimer();
    const appt = this.store.selectedAppointment();
    if (appt) this.store.startConsultationSession(appt);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      const m = Math.floor(this.timerSeconds / 60)
        .toString()
        .padStart(2, '0');
      const s = (this.timerSeconds % 60).toString().padStart(2, '0');
      this.callDuration.set(`${m}:${s}`);
    }, 1000);
  }

  toggleChatPanel(): void {
    this.showChat.update((v) => !v);
  }
  requestEndCall(): void {
    this.showEndModal.set(true);
  }
  cancelEndCall(): void {
    this.showEndModal.set(false);
  }

  confirmEndCall(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.showEndModal.set(false);

    const appt = this.store.selectedAppointment();
    if (!appt) {
      this.router.navigate(['/dermatology/scheduled-appointments']);
      return;
    }
    this.store.endConsultationSession(appt).subscribe({
      complete: () => this.router.navigate(['/dermatology/scheduled-appointments']),
      error: () => this.router.navigate(['/dermatology/scheduled-appointments']),
    });
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text) return;
    this.messages.update((msgs) => [
      ...msgs,
      { id: this.nextId++, from: 'patient', text, time: this.now() },
    ]);
    this.inputText = '';
  }

  private now(): string {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}
