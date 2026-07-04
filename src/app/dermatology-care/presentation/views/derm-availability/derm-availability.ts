import {Component, computed, effect, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatSelectModule} from '@angular/material/select';
import {FormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {DermatologyCareStore} from '../../../application/dermatology-care.store';
import {IamStore} from '../../../../iam/application/iam.store';
import {DermatologistAvailability} from '../../../domain/model/dermatologist-availability.entity';

/** Represents a day option in the availability form. */
interface DayOption {
  id:       string;
  labelKey: string;
  short:    string;
}

/**
 * Allows the dermatologist to configure working days, hours,
 * and appointment slot duration.
 */
@Component({
  selector:    'app-derm-availability',
  imports:     [MatIconModule, MatSelectModule, FormsModule, TranslatePipe],
  templateUrl: './derm-availability.html',
  styleUrl:    './derm-availability.css',
})
export class DermAvailability {
  readonly store           = inject(DermatologyCareStore);
  private readonly iamStore = inject(IamStore);
  protected router         = inject(Router);

  saveSuccess  = signal<boolean>(false);
  startTime    = signal<string>('09:00 AM');
  endTime      = signal<string>('05:00 PM');
  slotDuration = signal<string>('30');
  activeDays   = signal<Set<string>>(new Set(['mon', 'tue', 'wed', 'thu', 'fri']));

  /** Maps short day IDs to the full uppercase day names the backend expects. */
  private readonly DAY_MAP: Record<string, string> = {
    mon: 'MONDAY', tue: 'TUESDAY', wed: 'WEDNESDAY',
    thu: 'THURSDAY', fri: 'FRIDAY', sat: 'SATURDAY', sun: 'SUNDAY',
  };

  /** Reverse of {@link DAY_MAP} — full uppercase day name back to the short id. */
  private readonly DAY_MAP_REVERSE: Record<string, string> = Object.fromEntries(
    Object.entries(this.DAY_MAP).map(([short, full]) => [full, short]),
  );

  constructor() {
    // Reactively reflects whatever is actually saved for this dermatologist —
    // re-runs after every save too, since the store replaces the availability
    // in its signal with the backend response.
    effect(() => {
      const user = this.iamStore.currentUser();
      if (!user) return;
      const mine = this.store.availabilities().filter((a) => a.dermatologistId === user.id);
      if (mine.length === 0) return;

      const activeOnes = mine.filter((a) => a.active);
      this.activeDays.set(new Set(activeOnes.map((a) => this.DAY_MAP_REVERSE[a.dayOfWeek]).filter(Boolean)));
      const reference = activeOnes[0] ?? mine[0];
      this.startTime.set(this.to12h(reference.startTime));
      this.endTime.set(this.to12h(reference.endTime));
    });
  }

  /** Available weekday options. */
  readonly days: DayOption[] = [
    { id: 'mon', labelKey: 'dermatology.dermAvailability.days.monday',    short: 'Mo' },
    { id: 'tue', labelKey: 'dermatology.dermAvailability.days.tuesday',   short: 'Tu' },
    { id: 'wed', labelKey: 'dermatology.dermAvailability.days.wednesday', short: 'We' },
    { id: 'thu', labelKey: 'dermatology.dermAvailability.days.thursday',  short: 'Th' },
    { id: 'fri', labelKey: 'dermatology.dermAvailability.days.friday',    short: 'Fr' },
    { id: 'sat', labelKey: 'dermatology.dermAvailability.days.saturday',  short: 'Sa' },
    { id: 'sun', labelKey: 'dermatology.dermAvailability.days.sunday',    short: 'Su' },
  ];

  /** Available time options for start/end selection. */
  readonly timeOptions: string[] = [
    '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM',
  ];

  /** Available slot duration options in minutes. */
  readonly slotOptions: string[] = ['15', '30', '45', '60'];

  /** Label of currently active days for display. */
  readonly activeDaysLabel = computed(() =>
    this.days
      .filter(day => this.activeDays().has(day.id))
      .map(day => day.short)
      .join(', ') || 'None'
  );

  /** Toggles a day in the active days set. */
  toggleDay(dayId: string): void {
    this.activeDays.update(days => {
      const updated = new Set(days);
      updated.has(dayId) ? updated.delete(dayId) : updated.add(dayId);
      return updated;
    });
  }

  /**
   * Converts a 12-hour time string (e.g. "09:00 AM") to 24-hour HH:mm format ("09:00").
   */
  private to24h(time12: string): string {
    const [timePart, period] = time12.split(' ');
    const [hours, minutes]   = timePart.split(':').map(Number);
    let h = hours;
    if (period === 'AM' && h === 12) h = 0;
    if (period === 'PM' && h !== 12) h += 12;
    return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Converts a 24-hour HH:mm time string (e.g. "09:00") back to the 12-hour
   * "hh:mm AM/PM" format used by {@link timeOptions}.
   */
  private to12h(time24: string): string {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  /**
   * Saves the availability configuration: creates a new slot for days that
   * don't have one yet, updates the existing slot for days that already do
   * (the backend rejects a second create for the same day with a 409), and
   * deactivates any previously-saved day that got unchecked — a day that's
   * merely left out of the request is otherwise never told it's no longer
   * an active working day.
   */
  saveAvailability(): void {
    if (!this.store.availabilitiesReady()) return;
    const user = this.iamStore.currentUser();
    if (!user) return;
    const profile = this.store.dermatologistProfiles()
      .find(p => p.userId === user.id);
    if (!profile) return;

    const existingByDay = new Map(
      this.store.availabilities()
        .filter(a => a.dermatologistId === profile.userId)
        .map(a => [a.dayOfWeek, a] as const),
    );
    const selectedDays = new Set(Array.from(this.activeDays()).map(dayId => this.DAY_MAP[dayId]));

    this.activeDays().forEach(dayId => {
      const dayOfWeek = this.DAY_MAP[dayId];
      const existing = existingByDay.get(dayOfWeek);
      const availability = new DermatologistAvailability({
        id:              existing?.id ?? 0,
        dermatologistId: profile.userId,
        dayOfWeek,
        startTime:       this.to24h(this.startTime()),
        endTime:         this.to24h(this.endTime()),
        slotDuration:    Number(this.slotDuration()),
        active:          true,
      });
      if (existing) {
        this.store.updateAvailability(availability);
      } else {
        this.store.addAvailability(availability);
      }
    });

    // Any day that already had a slot but is no longer checked gets deactivated.
    existingByDay.forEach((existing, dayOfWeek) => {
      if (selectedDays.has(dayOfWeek) || !existing.active) return;
      this.store.updateAvailability(new DermatologistAvailability({
        id:              existing.id,
        dermatologistId: profile.userId,
        dayOfWeek,
        startTime:       existing.startTime,
        endTime:         existing.endTime,
        slotDuration:    existing.slotDuration,
        active:          false,
      }));
    });

    this.saveSuccess.set(true);
    setTimeout(() => this.saveSuccess.set(false), 2000);
  }

  /** Navigates back to the derm profile. */
  navigateBack(): void {
    this.router.navigate(['/derm/profile']);
  }
}
