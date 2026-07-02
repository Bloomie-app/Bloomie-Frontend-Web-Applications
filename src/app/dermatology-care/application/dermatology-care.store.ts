import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {HttpErrorResponse} from '@angular/common/http';
import {catchError, map, Observable, of, retry, switchMap, take, tap, throwError} from 'rxjs';
import {DermatologistProfile} from '../domain/model/dermatologist-profile.entity';
import {DermatologistAvailability} from '../domain/model/dermatologist-availability.entity';
import {Appointment, AppointmentStatus} from '../domain/model/appointment.entity';
import {Consultation} from '../domain/model/consultation.entity';
import {DermatologyCareApi} from '../infrastructure/dermatology-care-api';
import { IamStore } from '../../iam/application/iam.store';

/**
 * Holds dermatology care application state and coordinates
 * dermatologist, appointment, and consultation application layer behavior.
 */
@Injectable({ providedIn: 'root' })
export class DermatologyCareStore {
  private static readonly AVAILABILITY_LOOKAHEAD_DAYS = 120;

  private readonly dermatologistProfilesSignal = signal<DermatologistProfile[]>([]);
  private readonly availabilitiesSignal = signal<DermatologistAvailability[]>([]);
  private readonly availabilitiesReadySignal = signal<boolean>(false);
  private readonly appointmentsSignal = signal<Appointment[]>([]);
  private readonly consultationsSignal = signal<Consultation[]>([]);
  private readonly selectedDermatologistSignal = signal<DermatologistProfile | null>(null);
  private readonly selectedAppointmentSignal = signal<Appointment | null>(null);
  private readonly selectedConsultationSignal = signal<Consultation | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly pendingAppointmentDateSignal = signal<Date | null>(null);
  private readonly pendingAppointmentTimeSignal = signal<string>('');
  private readonly iamStore = inject(IamStore);
  private loadedForDermatologistId: number | null = null;

  /**
   * Readonly signal for the list of dermatologist profiles.
   */
  readonly dermatologistProfiles = this.dermatologistProfilesSignal.asReadonly();

  /**
   * Readonly signal for the list of dermatologist availability slots.
   */
  readonly availabilities = this.availabilitiesSignal.asReadonly();

  /**
   * Readonly signal indicating whether the current dermatologist's availabilities
   * have finished their initial load from the backend. Used to prevent the
   * availability editor from computing a diff against a not-yet-loaded (empty)
   * collection, which would silently skip deactivating previously active days.
   */
  readonly availabilitiesReady = this.availabilitiesReadySignal.asReadonly();

  /**
   * Readonly signal for the list of appointments.
   */
  readonly appointments = this.appointmentsSignal.asReadonly();

  /**
   * Readonly signal for the list of consultations.
   */
  readonly consultations = this.consultationsSignal.asReadonly();

  /**
   * Readonly signal for the currently selected dermatologist profile.
   */
  readonly selectedDermatologist = this.selectedDermatologistSignal.asReadonly();

  /**
   * Readonly signal for the currently selected appointment.
   */
  readonly selectedAppointment = this.selectedAppointmentSignal.asReadonly();

  /**
   * Readonly signal for the currently selected consultation.
   */
  readonly selectedConsultation = this.selectedConsultationSignal.asReadonly();

  /**
   * Readonly signal indicating if data is loading.
   */
  readonly loading = this.loadingSignal.asReadonly();

  /**
   * Readonly signal for the current error message.
   */
  readonly error = this.errorSignal.asReadonly();

  /**
   * Readonly signal for the pending appointment date selected by the patient.
   */
  readonly pendingAppointmentDate = this.pendingAppointmentDateSignal.asReadonly();

  /**
   * Readonly signal for the pending appointment time slot selected by the patient.
   */
  readonly pendingAppointmentTime = this.pendingAppointmentTimeSignal.asReadonly();

  /**
   * Computed signal for the count of available dermatologists.
   */
  readonly availableDermatologistCount = computed(
    () => this.dermatologistProfiles().filter((dermatologist) => dermatologist.available).length,
  );

  /**
   * Computed signal for the count of confirmed appointments.
   */
  readonly confirmedAppointmentCount = computed(
    () => this.appointments().filter((appointment) => appointment.isConfirmed).length,
  );

  readonly myAppointments = computed(() => {
    const user = this.iamStore.currentUser();
    if (!user) return [];
    return this.appointmentsSignal().filter((a) => Number(a.dermatologistId) === Number(user.id));
  });

  readonly myConsultations = computed(() => {
    const user = this.iamStore.currentUser();
    if (!user) return [];
    return this.consultationsSignal().filter((c) => Number(c.dermatologistId) === Number(user.id));
  });

  /**
   * Upcoming calendar dates (starting tomorrow) that match the loaded dermatologist availabilities.
   */
  readonly upcomingAvailableDates = computed((): Date[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allAvailabilities = this.availabilitiesSignal();
    const activeAvailabilities = allAvailabilities.filter((a) => a.active);
    const dates: Date[] = [];
    for (let i = 0; i <= DermatologyCareStore.AVAILABILITY_LOOKAHEAD_DAYS; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      // No schedule configured at all -> assume every day is bookable. Once a
      // schedule exists, only its still-active days are, even if that's none.
      if (allAvailabilities.length === 0 || activeAvailabilities.some((a) => a.matchesDate(date))) {
        dates.push(date);
      }
    }
    return dates;
  });

  /**
   * Returns the bookable time slots for a given date based on loaded availabilities.
   * @param date - The calendar date to get slots for.
   */
  timeSlotsForDate(date: Date): string[] {
    return this.availabilitiesSignal().filter((a) => a.active).find((a) => a.matchesDate(date))?.timeSlots ?? [];
  }

  /**
   * Creates an instance of DermatologyCareStore and loads initial data.
   * @param dermatologyCareApi - The API service for dermatology care data.
   */
  private readonly destroyRef = inject(DestroyRef);

  constructor(private dermatologyCareApi: DermatologyCareApi) {
    this.loadDermatologistProfiles();
    effect(() => {
      const user = this.iamStore.currentUser();
      untracked(() => {
        if (user && user.id !== this.loadedForDermatologistId) {
          this.loadedForDermatologistId = user.id;
          this.loadAppointments(user.id);
          this.loadConsultations(user.id);
          this.loadAvailabilities(user.id);
        }
      });
    });
  }

  /**
   * Selects a dermatologist profile by identifier.
   * @param id - Dermatologist profile identifier.
   * @returns Reactive selection for the requested dermatologist profile.
   */
  getDermatologistProfileById(id: number): Signal<DermatologistProfile | undefined> {
    return computed(() =>
      id
        ? this.dermatologistProfiles().find((dermatologist) => dermatologist.id === id)
        : undefined,
    );
  }

  /**
   * Selects an appointment by identifier.
   * @param id - Appointment identifier.
   * @returns Reactive selection for the requested appointment.
   */
  getAppointmentById(id: number): Signal<Appointment | undefined> {
    return computed(() =>
      id ? this.appointments().find((appointment) => appointment.id === id) : undefined,
    );
  }

  /**
   * Selects a consultation by identifier.
   * @param id - Consultation identifier.
   * @returns Reactive selection for the requested consultation.
   */
  getConsultationById(id: number): Signal<Consultation | undefined> {
    return computed(() =>
      id ? this.consultations().find((consultation) => consultation.id === id) : undefined,
    );
  }

  /**
   * Sets the currently selected dermatologist profile.
   * @param dermatologistProfile - The dermatologist profile to select.
   */
  selectDermatologist(dermatologistProfile: DermatologistProfile): void {
    this.selectedDermatologistSignal.set(dermatologistProfile);
    this.loadAvailabilities(dermatologistProfile.userId);
  }

  /**
   * Stores the date and time slot chosen by the patient before navigating to payment.
   * @param date - The calendar date of the appointment.
   * @param time - The time slot string (e.g. "09:00 - 10:00").
   */
  setPendingAppointmentDateTime(date: Date, time: string): void {
    this.pendingAppointmentDateSignal.set(date);
    this.pendingAppointmentTimeSignal.set(time);
  }

  /**
   * Sets the currently selected appointment.
   * @param appointment - The appointment to select.
   */
  selectAppointment(appointment: Appointment): void {
    this.selectedAppointmentSignal.set(appointment);
  }

  /**
   * Sets the currently selected consultation.
   * @param consultation - The consultation to select.
   */
  selectConsultation(consultation: Consultation): void {
    this.selectedConsultationSignal.set(consultation);
  }

  /**
   * Creates a new appointment.
   * @param appointment - The appointment to create.
   * @returns Stream with the created Appointment, so callers can chain a confirmation step.
   */
  addAppointment(appointment: Appointment): Observable<Appointment> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    return this.dermatologyCareApi.createAppointment(appointment).pipe(
      retry(2),
      tap((createdAppointment) => {
        this.appointmentsSignal.update((appointments) => [...appointments, createdAppointment]);
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.errorSignal.set(this.formatError(err, 'Failed to create appointment'));
        this.loadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Confirms a scheduled appointment so its consultation can be started later.
   * @param appointment - The appointment to confirm.
   * @returns Stream with the confirmed Appointment.
   */
  confirmAppointment(appointment: Appointment): Observable<Appointment> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    return this.dermatologyCareApi.confirmAppointment(appointment.id, appointment.patientId).pipe(
      retry(2),
      tap((confirmedAppointment) => {
        this.appointmentsSignal.update((appointments) =>
          appointments.map((existing) =>
            existing.id === confirmedAppointment.id ? confirmedAppointment : existing,
          ),
        );
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.errorSignal.set(this.formatError(err, 'Failed to confirm appointment'));
        this.loadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Cancels an existing appointment. The backend returns no body on success,
   * so the cancellation is applied to local state once the request succeeds.
   * @param appointment - The appointment to cancel; must carry the cancellation reason.
   */
  cancelAppointment(appointment: Appointment): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.dermatologyCareApi
      .cancelAppointmentRequest(appointment.id, appointment.patientId, appointment.cancellationReason)
      .pipe(retry(2))
      .subscribe({
        next: () => {
          appointment.status = AppointmentStatus.Cancelled;
          this.appointmentsSignal.update((appointments) =>
            appointments.map((existing) => (existing.id === appointment.id ? appointment : existing)),
          );
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to cancel appointment'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Saves clinical notes progressively during an in-progress consultation.
   * @param consultation - The consultation to update.
   * @param notes        - The notes text to persist.
   */
  saveConsultationNotes(consultation: Consultation, notes: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.dermatologyCareApi
      .saveConsultationNotes(consultation.id, notes)
      .pipe(retry(2))
      .subscribe({
        next: (updatedConsultation) => {
          this.consultationsSignal.update((consultations) =>
            consultations.map((existing) =>
              existing.id === updatedConsultation.id ? updatedConsultation : existing,
            ),
          );
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to save notes'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Returns the existing consultation for an appointment, or starts one so that
   * notes and clinical photos have a record to attach to as soon as a call starts.
   * Falls back to fetching the existing record when the other party (patient or
   * dermatologist) already started it first, since the backend rejects a second
   * start attempt for the same appointment with a 409 conflict.
   * @param appointment - The appointment the virtual call belongs to.
   */
  private ensureConsultationForAppointment(appointment: Appointment): Observable<Consultation> {
    const existing = this.consultationsSignal().find((c) => c.appointmentId === appointment.id);
    if (existing) return of(existing);

    return this.dermatologyCareApi
      .startConsultation(appointment.id, appointment.dermatologistId, appointment.patientId)
      .pipe(
        tap((created) => this.consultationsSignal.update((consultations) => [...consultations, created])),
        catchError((err) => {
          if (!(err instanceof HttpErrorResponse) || err.status !== 409) {
            return throwError(() => err);
          }
          return this.dermatologyCareApi.getConsultationByAppointmentId(appointment.id).pipe(
            switchMap((found) => (found ? of(found) : throwError(() => err))),
            tap((found) =>
              this.consultationsSignal.update((consultations) =>
                consultations.some((c) => c.id === found.id) ? consultations : [...consultations, found],
              ),
            ),
          );
        }),
      );
  }

  /**
   * Ensures a consultation record exists for the appointment when a virtual call starts.
   * @param appointment - The appointment the virtual call belongs to.
   */
  startConsultationSession(appointment: Appointment): void {
    this.ensureConsultationForAppointment(appointment).subscribe({
      next: (consultation) => this.selectedConsultationSignal.set(consultation),
      error: (err) => this.errorSignal.set(this.formatError(err, 'Failed to start consultation')),
    });
  }

  /**
   * Finishes the consultation and, through the backend's domain event, completes
   * its appointment once a virtual call ends. Runs when either the patient or the
   * dermatologist ends the session. Returns an observable so callers can wait for
   * the backend update to land before navigating away and re-fetching lists that
   * depend on the new status.
   * @param appointment - The appointment the virtual call belongs to.
   * @param notes       - Optional notes captured during the call to persist before finishing.
   */
  endConsultationSession(appointment: Appointment, notes?: string): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    return this.ensureConsultationForAppointment(appointment).pipe(
      switchMap((consultation) => {
        const saveNotes$ = notes !== undefined
          ? this.dermatologyCareApi.saveConsultationNotes(consultation.id, notes)
          : of(consultation);
        return saveNotes$.pipe(
          tap((updatedConsultation) => {
            this.consultationsSignal.update((consultations) =>
              consultations.map((existing) =>
                existing.id === updatedConsultation.id ? updatedConsultation : existing,
              ),
            );
          }),
          switchMap(() => this.dermatologyCareApi.finishConsultation(consultation.id, appointment.dermatologistId)),
        );
      }),
      tap((finishedConsultation) => {
        this.consultationsSignal.update((consultations) =>
          consultations.map((existing) =>
            existing.id === finishedConsultation.id ? finishedConsultation : existing,
          ),
        );
        // The backend completes the appointment via a domain event triggered by
        // finishing the consultation; reflect that locally for immediate UI feedback.
        appointment.status = AppointmentStatus.Completed;
        this.appointmentsSignal.update((appointments) =>
          appointments.map((existing) => (existing.id === appointment.id ? appointment : existing)),
        );
        this.loadingSignal.set(false);
      }),
      map(() => void 0),
      catchError((err) => {
        this.errorSignal.set(this.formatError(err, 'Failed to finish consultation'));
        this.loadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Creates a new dermatologist availability slot.
   * @param availability - The availability slot to create.
   */
  addAvailability(availability: DermatologistAvailability): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.dermatologyCareApi
      .createDermatologistAvailability(availability)
      .pipe(retry(2))
      .subscribe({
        next: (createdAvailability) => {
          this.availabilitiesSignal.update((availabilities) => [
            ...availabilities,
            createdAvailability,
          ]);
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to create availability'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Updates an existing dermatologist availability slot.
   * @param availability - The availability slot to update (must carry its existing id).
   */
  updateAvailability(availability: DermatologistAvailability): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.dermatologyCareApi
      .updateDermatologistAvailability(availability)
      .pipe(retry(2))
      .subscribe({
        next: (updatedAvailability) => {
          this.availabilitiesSignal.update((availabilities) =>
            availabilities.map((existing) =>
              existing.id === updatedAvailability.id ? updatedAvailability : existing,
            ),
          );
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to update availability'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Updates an existing dermatologist profile.
   * @param dermatologistProfile - The profile with updated values.
   */
  updateDermatologistProfile(dermatologistProfile: DermatologistProfile): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.dermatologyCareApi
      .updateDermatologistProfile(dermatologistProfile)
      .pipe(retry(2))
      .subscribe({
        next: (updatedProfile) => {
          this.dermatologistProfilesSignal.update((profiles) =>
            profiles.map((existing) =>
              existing.id === updatedProfile.id ? updatedProfile : existing,
            ),
          );
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to update dermatologist profile'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Loads all dermatologist profiles from the API.
   */
  private loadDermatologistProfiles(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.dermatologyCareApi
      .getDermatologistProfiles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dermatologistProfiles) => {
          this.dermatologistProfilesSignal.set(dermatologistProfiles);
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load dermatologist profiles'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Loads availability slots for a given dermatologist from the API.
   * @param dermatologistId - The ID of the dermatologist whose availabilities to load.
   */
  private loadAvailabilities(dermatologistId: number): void {
    this.loadingSignal.set(true);
    this.availabilitiesReadySignal.set(false);
    this.errorSignal.set(null);
    this.dermatologyCareApi
      .getDermatologistAvailabilities(dermatologistId)
      .pipe(take(1))
      .subscribe({
        next: (availabilities) => {
          this.availabilitiesSignal.set(availabilities);
          this.loadingSignal.set(false);
          this.availabilitiesReadySignal.set(true);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load availabilities'));
          this.loadingSignal.set(false);
          this.availabilitiesReadySignal.set(true);
        },
      });
  }

  /**
   * Loads all appointments from the API.
   */

  private loadAppointments(dermatologistId?: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const request$ = dermatologistId
      ? this.dermatologyCareApi.getAppointmentsByDermatologistId(dermatologistId)
      : this.dermatologyCareApi.getAppointments();

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (appointments) => {
        this.appointmentsSignal.set(appointments);
        this.loadingSignal.set(false);
        this.errorSignal.set(null);
      },
      error: (err) => {
        this.errorSignal.set(this.formatError(err, 'Failed to load appointments'));
        this.loadingSignal.set(false);
      },
    });
  }

  private loadConsultations(dermatologistId?: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.dermatologyCareApi
      .getConsultations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (consultations) => {
          const filtered = dermatologistId
            ? consultations.filter((c) => Number(c.dermatologistId) === Number(dermatologistId))
            : consultations;
          this.consultationsSignal.set(filtered);
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load consultations'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Normalizes unknown errors into a display-friendly message.
   * @param error - Source error.
   * @param fallback - Default message when details are unavailable.
   * @returns Normalized message.
   */
  private formatError(error: any, fallback: string): string {
    if (error instanceof Error) {
      return error.message.includes('Resource not found')
        ? `${fallback}: Not found`
        : error.message;
    }
    return fallback;
  }

  loadAppointmentsByPatientId(patientId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.dermatologyCareApi
      .getAppointmentsByPatientId(patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (appointments) => {
          this.appointmentsSignal.set(appointments);
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load appointments'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Loads all consultations belonging to a given patient from the backend.
   * The consultations endpoint has no patient filter, so all records are
   * fetched and filtered client-side (mirrors the dermatologist-side filtering).
   * @param patientId - The patient user ID whose consultations to load.
   */
  loadConsultationsByPatientId(patientId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.dermatologyCareApi
      .getConsultations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (consultations) => {
          this.consultationsSignal.set(
            consultations.filter((c) => Number(c.patientId) === Number(patientId)),
          );
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load consultations'));
          this.loadingSignal.set(false);
        },
      });
  }
}


