import {Component, computed, DestroyRef, effect, inject, signal, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {TranslatePipe} from '@ngx-translate/core';
import {DermatologyCareStore} from '../../../application/dermatology-care.store';
import {IamStore} from '../../../../iam/application/iam.store';
import {Appointment, AppointmentStatus} from '../../../domain/model/appointment.entity';

interface AgendaDay {
  date:    Date;
  day:     number;
  name:    string;
  isToday: boolean;
}

@Component({
  selector:    'app-derm-agenda',
  imports:     [MatIconModule, TranslatePipe],
  templateUrl: './derm-agenda.html',
  styleUrl:    './derm-agenda.css',
})
export class DermAgenda {
  readonly store        = inject(DermatologyCareStore);
  readonly iamStore     = inject(IamStore);
  private readonly destroyRef = inject(DestroyRef);
  protected router      = inject(Router);

  selectedDayIndex = signal<number>(2);
  patientNames     = signal<Record<number, string>>({});

  private readonly dayNames     = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  private readonly fullDayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  private readonly monthNames   = ['January','February','March','April','May','June',
                                   'July','August','September','October','November','December'];

  readonly agendaDays = computed((): AgendaDay[] => {
    const today = new Date();
    return Array.from({length: 7}, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index - 2);
      return {
        date,
        day:     date.getDate(),
        name:    this.dayNames[date.getDay()],
        isToday: index === 2,
      };
    });
  });

  readonly selectedDayLabel = computed((): string => {
    const day = this.agendaDays()[this.selectedDayIndex()];
    if (!day) return '';
    return `${this.fullDayNames[day.date.getDay()]}, ${this.monthNames[day.date.getMonth()]} ${day.date.getDate()}`;
  });

  readonly appointmentsForSelectedDay = computed(() => {
    const day = this.agendaDays()[this.selectedDayIndex()];
    if (!day) return this.store.appointments();
    const target = day.date;
    return this.store.myAppointments().filter(a => {
      const d = new Date(a.scheduledAt);
      return d.getFullYear() === target.getFullYear() &&
             d.getMonth()    === target.getMonth()    &&
             d.getDate()     === target.getDate();
    });
  });

  readonly confirmedCountForDay = computed(() =>
    this.appointmentsForSelectedDay().filter(a => a.isConfirmed).length
  );

  constructor() {
    // Reactive rather than a one-shot ngOnInit call: appointments load asynchronously
    // from the store, so this re-runs and backfills names as new patient ids show up.
    effect(() => {
      const uniqueIds = [...new Set(this.store.myAppointments().map(a => a.patientId))];
      untracked(() => this.loadPatientNames(uniqueIds));
    });
  }

  /** Fetches patient display names for any of the given ids not already resolved. */
  private loadPatientNames(patientIds: number[]): void {
    const known = this.patientNames();
    const missingIds = patientIds.filter(id => !(id in known));
    missingIds.forEach(id => {
      this.iamStore.getUserById(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: user => {
            this.patientNames.update(names => ({
              ...names,
              [id]: `${user.name} ${user.lastName}`,
            }));
          },
          error: () => {},
        });
    });
  }

  getPatientName(patientId: number): string {
    return this.patientNames()[patientId] ?? `Patient #${patientId}`;
  }

  selectDay(index: number): void {
    this.selectedDayIndex.set(index);
  }

  startCall(appointment: Appointment): void {
    this.store.selectAppointment(appointment);
    this.router.navigate(['/derm/virtual-call']);
  }

  /** Returns true when the call button should be enabled (any time, as long as the appointment is active). */
  canStartCall(appointment: Appointment): boolean {
    return this.isActive(appointment);
  }

  /** Returns true if the appointment is still active (not cancelled or completed). */
  isActive(appointment: Appointment): boolean {
    return !appointment.isCancelled && appointment.status !== AppointmentStatus.Completed;
  }

  timeOf(scheduledAt: string): string {
    return new Date(scheduledAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  statusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      [AppointmentStatus.Scheduled]:  'Scheduled',
      [AppointmentStatus.Confirmed]:  'Confirmed',
      [AppointmentStatus.InProgress]: 'In Progress',
      [AppointmentStatus.Completed]:  'Completed',
      [AppointmentStatus.Cancelled]:  'Cancelled',
    };
    return labels[status] ?? status;
  }

  statusMod(status: AppointmentStatus): string {
    const mods: Record<AppointmentStatus, string> = {
      [AppointmentStatus.Scheduled]:  'scheduled',
      [AppointmentStatus.Confirmed]:  'confirmed',
      [AppointmentStatus.InProgress]: 'inprogress',
      [AppointmentStatus.Completed]:  'completed',
      [AppointmentStatus.Cancelled]:  'cancelled',
    };
    return mods[status] ?? '';
  }

  statusIcon(status: AppointmentStatus): string {
    return status === AppointmentStatus.Completed ? 'check_circle' : 'schedule';
  }
}
