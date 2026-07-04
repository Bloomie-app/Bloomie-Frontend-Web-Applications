import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';
import { DermatologyCareStore } from '../../../application/dermatology-care.store';
import { Appointment, AppointmentStatus } from '../../../domain/model/appointment.entity';
import { DermatologistProfile } from '../../../domain/model/dermatologist-profile.entity';
import { IamStore } from '../../../../iam/application/iam.store';

@Component({
  selector:    'app-scheduled-appointments',
  imports:     [MatIconModule, TranslatePipe],
  templateUrl: './scheduled-appointments.html',
  styleUrl:    './scheduled-appointments.css',
})
export class ScheduledAppointments {
  readonly store             = inject(DermatologyCareStore);
  private readonly iamStore  = inject(IamStore);
  private readonly translate = inject(TranslateService);
  protected router           = inject(Router);

  readonly AppointmentStatus = AppointmentStatus;

  protected readonly userPhotoMap = signal<Record<number, string | null>>({});

  constructor() {
    effect(() => {
      const appointments = this.store.appointments();
      const profiles     = this.store.dermatologistProfiles();
      const loaded       = untracked(() => this.userPhotoMap());

      appointments.forEach(apt => {
        const profile = profiles.find(p => p.id === apt.dermatologistId || p.userId === apt.dermatologistId);
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

  ngOnInit(): void {
    const user = this.iamStore.currentUser();
    if (user) {
      this.store.loadAppointmentsByPatientId(user.id);
    }
  }

  /** Appointments still pending a virtual call — excludes completed sessions, which move to past consultations. */
  readonly upcomingAppointments = computed(() =>
    this.store.appointments().filter(a => a.status !== AppointmentStatus.Completed)
  );

  readonly activeAppointmentCount = computed(() =>
    this.upcomingAppointments().filter(a => !a.isCancelled).length
  );

  protected doctorProfileForAppointment(apt: Appointment): DermatologistProfile | undefined {
    return this.store.dermatologistProfiles().find(
      p => p.id === apt.dermatologistId || p.userId === apt.dermatologistId
    );
  }

  protected doctorPhotoForAppointment(apt: Appointment): string | null {
    const p = this.doctorProfileForAppointment(apt);
    return p ? (this.userPhotoMap()[p.userId] ?? null) : null;
  }

  protected doctorDisplayName(apt: Appointment): string {
    const p = this.doctorProfileForAppointment(apt);
    if (!p) return '—';
    return p.fullName ? `Dr. ${p.fullName}` : p.specialty;
  }

  protected initialsForProfile(profile: DermatologistProfile): string {
    const source = profile.fullName || profile.specialty;
    return source.split(' ').map((w: string) => w[0] ?? '').slice(0, 2).join('').toUpperCase();
  }

  protected formattedDate(apt: Appointment): string {
    if (!apt.scheduledAt) return '—';
    const lang = this.translate.currentLang === 'es' ? 'es-ES' : 'en-US';
    return new Date(apt.scheduledAt).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  protected formattedTime(apt: Appointment): string {
    if (!apt.scheduledAt) return '';
    const lang = this.translate.currentLang === 'es' ? 'es-ES' : 'en-US';
    return new Date(apt.scheduledAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  }

  cancelAppointment(appointment: Appointment): void {
    this.store.selectAppointment(appointment);
    this.router.navigate(['/dermatology/cancel-appointment']);
  }

  joinCall(appointment: Appointment): void {
    this.store.selectAppointment(appointment);
    this.router.navigate(['/dermatology/virtual-call']);
  }

  navigateBack(): void {
    this.router.navigate(['/dermatology']);
  }


}
