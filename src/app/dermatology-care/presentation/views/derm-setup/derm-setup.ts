import {Component, computed, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {FormsModule} from '@angular/forms';
import {IamStore} from '../../../../iam/application/iam.store';
import {DermatologyCareStore} from '../../../application/dermatology-care.store';
import {DermatologistAvailability} from '../../../domain/model/dermatologist-availability.entity';
import {
  formatLicenseNumber,
  LICENSE_NUMBER_MAX_LENGTH,
  LICENSE_NUMBER_PLACEHOLDER,
} from '../../../../shared/presentation/utils/license-number.util';

interface DayOption { id: string; short: string; label: string; }

@Component({
  selector:    'app-derm-setup',
  standalone:  true,
  imports:     [MatIconModule, FormsModule],
  templateUrl: './derm-setup.html',
  styleUrl:    './derm-setup.css',
})
export class DermSetup {
  private readonly router    = inject(Router);
  private readonly iamStore  = inject(IamStore);
  private readonly dermStore = inject(DermatologyCareStore);

  protected step = signal<number>(1);
  protected readonly totalSteps = 3;
  protected saving = signal<boolean>(false);

  // Step 1 fields
  protected specialty     = signal<string>('Dermatology');
  protected licenseNumber = signal<string>('');
  protected readonly licenseNumberPlaceholder = LICENSE_NUMBER_PLACEHOLDER;
  protected readonly licenseNumberMaxLength   = LICENSE_NUMBER_MAX_LENGTH;

  // Step 2 fields
  protected biography    = signal<string>('');
  protected contactPhone = signal<string>('');
  protected fee          = signal<string>('');

  // Step 3 fields
  protected startTime  = signal<string>('09:00 AM');
  protected endTime    = signal<string>('05:00 PM');
  protected activeDays = signal<Set<string>>(new Set(['mon', 'tue', 'wed', 'thu', 'fri']));

  protected readonly userName = computed(() => this.iamStore.currentUser()?.name ?? 'Doctor');
  protected readonly progress = computed(() => (this.step() / this.totalSteps) * 100);

  readonly specialties = [
    'Dermatology',
    'Pediatric Dermatology',
    'Cosmetic Dermatology',
    'Dermatopathology',
    'Mohs Surgery',
    'Teledermatology',
  ] as const;

  readonly days: DayOption[] = [
    { id: 'mon', short: 'Mo', label: 'Monday'    },
    { id: 'tue', short: 'Tu', label: 'Tuesday'   },
    { id: 'wed', short: 'We', label: 'Wednesday' },
    { id: 'thu', short: 'Th', label: 'Thursday'  },
    { id: 'fri', short: 'Fr', label: 'Friday'    },
    { id: 'sat', short: 'Sa', label: 'Saturday'  },
    { id: 'sun', short: 'Su', label: 'Sunday'    },
  ];

  readonly timeOptions: string[] = [
    '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM',
  ];

  private readonly DAY_MAP: Record<string, string> = {
    mon: 'MONDAY', tue: 'TUESDAY', wed: 'WEDNESDAY',
    thu: 'THURSDAY', fri: 'FRIDAY', sat: 'SATURDAY', sun: 'SUNDAY',
  };

  protected nextStep(): void {
    if (this.step() < this.totalSteps) {
      this.step.update(s => s + 1);
    } else {
      this.finish();
    }
  }

  protected prevStep(): void {
    if (this.step() > 1) this.step.update(s => s - 1);
  }

  protected toggleDay(dayId: string): void {
    this.activeDays.update(days => {
      const next = new Set(days);
      next.has(dayId) ? next.delete(dayId) : next.add(dayId);
      return next;
    });
  }

  protected isDayActive(dayId: string): boolean {
    return this.activeDays().has(dayId);
  }

  protected onLicenseNumberChange(rawValue: string): void {
    this.licenseNumber.set(formatLicenseNumber(rawValue));
  }

  protected skipSetup(): void {
    const user = this.iamStore.currentUser();
    if (user) localStorage.setItem(`bloomie_setup_${user.id}`, 'true');
    this.router.navigate(['/derm/agenda']);
  }

  private to24h(time12: string): string {
    const [timePart, period] = time12.split(' ');
    const [hours, minutes]   = timePart.split(':').map(Number);
    let h = hours;
    if (period === 'AM' && h === 12) h = 0;
    if (period === 'PM' && h !== 12) h += 12;
    return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private finish(): void {
    const user = this.iamStore.currentUser();
    if (!user) return;
    this.saving.set(true);

    const profile = this.dermStore.dermatologistProfiles()
      .find(p => Number(p.userId) === Number(user.id));

    if (profile) {
      profile.specialty       = this.specialty();
      profile.licenseNumber   = this.licenseNumber();
      profile.consultationFee = parseFloat(this.fee()) || 0;
      profile.biography       = this.biography();
      profile.contactPhone    = this.contactPhone();
      this.dermStore.updateDermatologistProfile(profile);
    }

    this.activeDays().forEach(dayId => {
      const availability = new DermatologistAvailability({
        id:              0,
        dermatologistId: profile?.userId ?? user.id,
        dayOfWeek:       this.DAY_MAP[dayId],
        startTime:       this.to24h(this.startTime()),
        endTime:         this.to24h(this.endTime()),
        slotDuration:    30,
      });
      this.dermStore.addAvailability(availability);
    });

    localStorage.setItem(`bloomie_setup_${user.id}`, 'true');
    setTimeout(() => this.router.navigate(['/derm/agenda']), 600);
  }
}
