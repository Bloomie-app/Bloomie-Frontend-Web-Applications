import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { DermatologyCareStore } from '../../../application/dermatology-care.store';
import { AppointmentStatus } from '../../../domain/model/appointment.entity';

@Component({
  selector:    'app-consult-home',
  imports:     [MatIconModule, TranslatePipe],
  templateUrl: './consult-home.html',
  styleUrl:    './consult-home.css',
})
export class ConsultHome {
  readonly store   = inject(DermatologyCareStore);
  private  router  = inject(Router);

  readonly specialistsCount = computed((): number =>
    this.store.dermatologistProfiles().length,
  );

  readonly upcomingCount = computed((): number => {
    const now = new Date();
    return this.store.appointments().filter(a => {
      const active =
        a.status === AppointmentStatus.Scheduled ||
        a.status === AppointmentStatus.Confirmed;
      return active && new Date(a.scheduledAt) > now;
    }).length;
  });

  readonly pastCount = computed((): number =>
    this.store.appointments().filter(a =>
      a.status === AppointmentStatus.Completed ||
      new Date(a.scheduledAt) < new Date(),
    ).length,
  );

  navigateBack():      void { this.router.navigate(['/dashboard']); }
  navigateBook():      void { this.router.navigate(['/dermatology/select-doctor']); }
  navigatePast():      void { this.router.navigate(['/dermatology/select-consultation']); }
  navigateScheduled(): void { this.router.navigate(['/dermatology/scheduled-appointments']); }
}
