import { Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';
import { DermatologyCareStore } from '../../../application/dermatology-care.store';
import { Consultation, ConsultationStatus } from '../../../domain/model/consultation.entity';
import { DermatologistProfile } from '../../../domain/model/dermatologist-profile.entity';
import { IamStore } from '../../../../iam/application/iam.store';

@Component({
  selector:    'app-select-consultation',
  imports:     [MatIconModule, TranslatePipe],
  templateUrl: './select-consultation.html',
  styleUrl:    './select-consultation.css',
})
export class SelectConsultation implements OnInit {
  readonly store            = inject(DermatologyCareStore);
  private readonly iamStore = inject(IamStore);
  private readonly translate = inject(TranslateService);
  protected router           = inject(Router);

  readonly ConsultationStatus = ConsultationStatus;

  protected readonly userPhotoMap = signal<Record<number, string | null>>({});

  ngOnInit(): void {
    const user = this.iamStore.currentUser();
    if (user) this.store.loadConsultationsByPatientId(user.id);
  }

  constructor() {
    effect(() => {
      const consultations = this.store.consultations();
      const profiles      = this.store.dermatologistProfiles();
      const loaded        = untracked(() => this.userPhotoMap());

      consultations.forEach(c => {
        const profile = profiles.find(p => p.id === c.dermatologistId || p.userId === c.dermatologistId);
        const userId  = profile?.userId;
        if (userId !== undefined && !(userId in loaded)) {
          this.userPhotoMap.update(m => ({ ...m, [userId]: null }));
          this.iamStore.getUserById(userId)
            .pipe(take(1))
            .subscribe({
              next:  user => this.userPhotoMap.update(m => ({ ...m, [userId]: user.photoUrl ?? null })),
              error: () => {},
            });
        }
      });
    }, { allowSignalWrites: true });
  }

  protected dermPhotoForConsultation(c: Consultation): string | null {
    const profile = this.store.dermatologistProfiles().find(
      p => p.id === c.dermatologistId || p.userId === c.dermatologistId
    );
    const userId = profile?.userId;
    return userId !== undefined ? (this.userPhotoMap()[userId] ?? null) : null;
  }

  protected profileForConsultation(c: Consultation): DermatologistProfile | undefined {
    return this.store.dermatologistProfiles().find(
      p => p.id === c.dermatologistId || p.userId === c.dermatologistId
    );
  }

  protected doctorDisplayName(c: Consultation): string {
    const p = this.profileForConsultation(c);
    if (!p) return '—';
    return p.fullName ? `Dr. ${p.fullName}` : p.specialty;
  }

  protected initialsForProfile(profile: DermatologistProfile): string {
    const source = profile.fullName || profile.specialty;
    return source.split(' ').map((w: string) => w[0] ?? '').slice(0, 2).join('').toUpperCase();
  }

  protected formattedDate(c: Consultation): string {
    if (!c.startedAt) return '—';
    const lang = this.translate.currentLang === 'es' ? 'es-ES' : 'en-US';
    return new Date(c.startedAt).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  protected formattedTime(c: Consultation): string {
    if (!c.startedAt) return '';
    const lang = this.translate.currentLang === 'es' ? 'es-ES' : 'en-US';
    return new Date(c.startedAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  }

  selectConsultation(c: Consultation): void {
    this.store.selectConsultation(c);
    this.router.navigate(['/dermatology/consultation-summary']);
  }

  getActionKey(c: Consultation): string {
    if (c.status === ConsultationStatus.Cancelled) return 'dermatology.selectConsultation.rebook';
    return 'dermatology.selectConsultation.viewDetails';
  }

  navigateBack(): void {
    this.router.navigate(['/dermatology']);
  }
}
