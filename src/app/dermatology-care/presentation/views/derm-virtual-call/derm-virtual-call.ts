import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DermatologyCareStore } from '../../../application/dermatology-care.store';

export type DermCallTab = 'chat' | 'notes';

interface CallMessage {
  id: number;
  from: 'doctor' | 'patient';
  text: string;
  time: string;
}

@Component({
  selector: 'app-derm-virtual-call',
  imports: [MatIconModule, FormsModule, TranslatePipe],
  templateUrl: './derm-virtual-call.html',
  styleUrl: './derm-virtual-call.css',
})
export class DermVirtualCall implements OnInit, OnDestroy {
  readonly store = inject(DermatologyCareStore);
  protected router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly sanitizer = inject(DomSanitizer);

  showEndModal = signal<boolean>(false);
  activeTab = signal<DermCallTab>('notes');
  callDuration = signal<string>('00:00');
  saveSuccess = signal<boolean>(false);

  inputText = '';
  notes = this.translate.instant('dermatology.dermCall.notesTemplate');
  messages = signal<CallMessage[]>([]);

  readonly wherebyUrl: SafeResourceUrl;

  private nextId = 1;
  private timerSeconds = 0;
  private timerInterval?: ReturnType<typeof setInterval>;

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

  setTab(tab: DermCallTab): void {
    this.activeTab.set(tab);
  }
  requestEndCall(): void {
    this.showEndModal.set(true);
  }
  cancelEndCall(): void {
    this.showEndModal.set(false);
  }

  saveNotes(): void {
    const appt = this.store.selectedAppointment();
    if (appt) {
      const consultation = this.store.myConsultations().find((c) => c.appointmentId === appt.id);
      if (consultation) {
        this.store.saveConsultationNotes(consultation, this.notes);
      }
    }
    this.saveSuccess.set(true);
    setTimeout(() => this.saveSuccess.set(false), 2500);
  }

  confirmEndCall(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.showEndModal.set(false);

    const appt = this.store.selectedAppointment();
    if (!appt) {
      this.router.navigate(['/derm/agenda']);
      return;
    }
    this.store.endConsultationSession(appt, this.notes).subscribe({
      complete: () => this.router.navigate(['/derm/agenda']),
      error: () => this.router.navigate(['/derm/agenda']),
    });
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text) return;
    this.messages.update((msgs) => [
      ...msgs,
      { id: this.nextId++, from: 'doctor', text, time: this.now() },
    ]);
    this.inputText = '';
  }

  private now(): string {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}
