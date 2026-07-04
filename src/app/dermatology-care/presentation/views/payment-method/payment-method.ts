import {Component, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {FormsModule} from '@angular/forms';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {DermatologyCareStore} from '../../../application/dermatology-care.store';
import {IamStore} from '../../../../iam/application/iam.store';
import {Appointment, AppointmentStatus} from '../../../domain/model/appointment.entity';

export type PaymentStep = 'select' | 'add-card' | 'confirmed';
export type PaymentOption = 'credit-card' | 'debit-card' | null;

interface PaymentMethodOption {
  id:       PaymentOption;
  labelKey: string;
  icon:     string;
}

/**
 * Handles the three-step payment flow: method selection, card details, and confirmation.
 */
@Component({
  selector:    'app-payment-method',
  imports:     [MatIconModule, FormsModule, TranslatePipe],
  templateUrl: './payment-method.html',
  styleUrl:    './payment-method.css',
})
export class PaymentMethod {
  readonly store               = inject(DermatologyCareStore);
  private readonly iamStore    = inject(IamStore);
  private readonly translateSvc = inject(TranslateService);
  protected router             = inject(Router);

  step            = signal<PaymentStep>('select');
  selectedPayment = signal<PaymentOption>(null);
  showError       = signal<boolean>(false);
  bookingError    = signal<string | null>(null);
  cardHolderName  = '';
  cardNumber      = '';
  expirationDate  = '';
  cvv             = '';

  readonly cardMethods: PaymentMethodOption[] = [
    { id: 'credit-card', labelKey: 'dermatology.payment.creditCard', icon: 'credit_card' },
    { id: 'debit-card',  labelKey: 'dermatology.payment.debitCard',  icon: 'credit_card' },
  ];

  selectPaymentMethod(method: PaymentOption): void {
    this.selectedPayment.set(method);
  }

  proceedToCardDetails(): void {
    if (this.selectedPayment()) {
      this.step.set('add-card');
    }
  }

  onCardNumberInput(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 16);
    const value  = digits.match(/.{1,4}/g)?.join(' ') ?? digits;
    this.cardNumber = value;
    input.value     = value;
  }

  onExpirationDateInput(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 4);
    const value  = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
    this.expirationDate = value;
    input.value         = value;
  }

  /**
   * Validates card fields, creates the appointment in the backend, then shows confirmation.
   * Stays on this step and surfaces a specific message if the slot was taken by someone
   * else in the meantime, instead of claiming success regardless of the outcome.
   */
  payNow(): void {
    const rawCard = this.cardNumber.replace(/\s/g, '');
    if (!this.cardHolderName || rawCard.length !== 16 || this.expirationDate.length !== 5 || this.cvv.length !== 3) {
      this.showError.set(true);
      return;
    }
    this.showError.set(false);
    this.bookingError.set(null);

    const currentUser = this.iamStore.currentUser();
    const derm        = this.store.selectedDermatologist();
    const date        = this.store.pendingAppointmentDate();
    const time        = this.store.pendingAppointmentTime();

    if (!currentUser || !derm || !date || !time) return;

    const [startHour, startMinute] = time.split(' - ')[0].split(':').map(Number);
    // Sent as a plain local datetime (no timezone suffix) — the backend rejects
    // any scheduledAt with a "Z" or offset as appointment.scheduled.at.invalid.
    const pad = (n: number) => String(n).padStart(2, '0');
    const scheduledAt = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      + `T${pad(startHour)}:${pad(startMinute)}:00`;

    const appointment = new Appointment({
      id:                 0,
      patientId:          currentUser.id,
      dermatologistId:    derm.userId,
      scheduledAt,
      status:             AppointmentStatus.Scheduled,
      cancellationReason: '',
    });

    this.store.addAppointment(appointment).subscribe({
      next: (created) => {
        this.step.set('confirmed');
        // Confirm right after scheduling so the appointment is ready for its
        // consultation to start — the backend requires CONFIRMED status for that.
        // Best-effort: the appointment is already booked even if this step fails.
        this.store.confirmAppointment(created).subscribe({ error: () => {} });
      },
      error: (err) => this.bookingError.set(this.bookingErrorMessage(err)),
    });
  }

  private bookingErrorMessage(err: unknown): string {
    const details = (err as { details?: string } | null)?.details;
    let key = 'dermatology.payment.bookingFailedError';
    if (details === 'appointment.slot.already.taken') {
      key = 'dermatology.payment.slotTakenError';
    } else if (details === 'appointment.scheduled.at.must.be.future') {
      key = 'dermatology.payment.pastTimeError';
    }
    return this.translateSvc.instant(key);
  }

  /** Sends the patient back to the schedule so they can pick a different time. */
  chooseAnotherTime(): void {
    this.router.navigate(['/dermatology/book-appointment']);
  }

  /** Navigates to scheduled appointments after viewing confirmation. */
  goToAppointments(): void {
    this.router.navigate(['/dermatology/scheduled-appointments']);
  }

  navigateBack(): void {
    if (this.step() === 'add-card') {
      this.step.set('select');
    } else if (this.step() === 'confirmed') {
      this.router.navigate(['/dermatology/scheduled-appointments']);
    } else {
      this.router.navigate(['/dermatology/book-appointment']);
    }
  }
}
