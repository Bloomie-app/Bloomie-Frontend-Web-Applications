import {Injectable} from '@angular/core';
import {BaseApi} from '../..//shared/infrastructure/base-api';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {DermatologistProfile} from '../domain/model/dermatologist-profile.entity';
import {DermatologistAvailability} from '../domain/model/dermatologist-availability.entity';
import {Appointment} from '../domain/model/appointment.entity';
import {Consultation} from '../domain/model/consultation.entity';
import {DermatologistProfilesApiEndpoint} from './dermatologist-profiles-api-endpoint';
import {DermatologistAvailabilitiesApiEndpoint} from './dermatologist-availabilities-api-endpoint';
import {AppointmentsApiEndpoint} from './appointments-api-endpoint';
import {ConsultationsApiEndpoint} from './consultations-api-endpoint'
import { ConsultationResource } from './consultation.response';
import { environment } from '../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { ConsultationAssembler } from './consultation.assembler';
import { AppointmentResource } from './appointment.response';
import { AppointmentAssembler } from './appointment.assembler';

/**
 * Infrastructure facade for dermatology care endpoint operations.
 */
@Injectable({ providedIn: 'root' })
export class DermatologyCareApi extends BaseApi {
  private readonly dermatologistProfilesEndpoint: DermatologistProfilesApiEndpoint;
  private readonly dermatologistAvailabilitiesEndpoint: DermatologistAvailabilitiesApiEndpoint;
  private readonly appointmentsEndpoint: AppointmentsApiEndpoint;
  private readonly consultationsEndpoint: ConsultationsApiEndpoint;

  /**
   * Creates an instance of DermatologyCareApi.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(private readonly http: HttpClient) {
    super();
    this.dermatologistProfilesEndpoint = new DermatologistProfilesApiEndpoint(http);
    this.dermatologistAvailabilitiesEndpoint = new DermatologistAvailabilitiesApiEndpoint(http);
    this.appointmentsEndpoint = new AppointmentsApiEndpoint(http);
    this.consultationsEndpoint = new ConsultationsApiEndpoint(http);
  }

  /**
   * Retrieves all dermatologist profiles.
   * @returns Stream with the dermatologist profile collection.
   */
  getDermatologistProfiles(): Observable<DermatologistProfile[]> {
    return this.dermatologistProfilesEndpoint.getAll();
  }

  /**
   * Retrieves a single dermatologist profile by ID.
   * @param id - The ID of the dermatologist profile.
   * @returns Stream with the matched DermatologistProfile entity.
   */
  getDermatologistProfile(id: number): Observable<DermatologistProfile> {
    return this.dermatologistProfilesEndpoint.getById(id);
  }

  /**
   * Creates a new dermatologist profile.
   * @param dermatologistProfile - The profile to create.
   * @returns Stream with the created DermatologistProfile entity.
   */
  createDermatologistProfile(
    dermatologistProfile: DermatologistProfile,
  ): Observable<DermatologistProfile> {
    return this.dermatologistProfilesEndpoint.create(dermatologistProfile);
  }

  /**
   * Updates an existing dermatologist profile.
   * @param dermatologistProfile - The profile to update.
   * @returns Stream with the updated DermatologistProfile entity.
   */
  updateDermatologistProfile(
    dermatologistProfile: DermatologistProfile,
  ): Observable<DermatologistProfile> {
    return this.dermatologistProfilesEndpoint.update(dermatologistProfile, dermatologistProfile.id);
  }

  /**
   * Retrieves availability slots for a given dermatologist from the backend.
   * @param dermatologistId - The dermatologist user ID to filter by.
   * @returns Stream with the filtered dermatologist availability collection.
   */
  getDermatologistAvailabilities(dermatologistId: number): Observable<DermatologistAvailability[]> {
    return this.dermatologistAvailabilitiesEndpoint.getByDermatologistId(dermatologistId);
  }

  /**
   * Creates a new availability slot for a dermatologist.
   * @param dermatologistAvailability - The availability slot to create.
   * @returns Stream with the created DermatologistAvailability entity.
   */
  createDermatologistAvailability(
    dermatologistAvailability: DermatologistAvailability,
  ): Observable<DermatologistAvailability> {
    return this.dermatologistAvailabilitiesEndpoint.create(dermatologistAvailability);
  }

  /**
   * Updates an existing availability slot.
   * @param dermatologistAvailability - The availability slot to update.
   * @returns Stream with the updated DermatologistAvailability entity.
   */
  updateDermatologistAvailability(
    dermatologistAvailability: DermatologistAvailability,
  ): Observable<DermatologistAvailability> {
    return this.dermatologistAvailabilitiesEndpoint.update(
      dermatologistAvailability,
      dermatologistAvailability.id,
    );
  }

  /**
   * Retrieves all appointments.
   * @returns Stream with the appointment collection.
   */
  getAppointments(): Observable<Appointment[]> {
    return this.http
      .get<
        AppointmentResource[]
      >(`${environment.backendBasePath}${environment.backendAppointmentsEndpointPath}`)
      .pipe(
        map((resources: AppointmentResource[]) =>
          resources.map((r) => new AppointmentAssembler().toEntityFromResource(r)),
        ),
      );
  }

  /**
   * Retrieves a single appointment by ID.
   * @param id - The ID of the appointment.
   * @returns Stream with the matched Appointment entity.
   */
  getAppointment(id: number): Observable<Appointment> {
    return this.appointmentsEndpoint.getById(id);
  }

  /**
   * Creates a new appointment.
   * @param appointment - The appointment to create.
   * @returns Stream with the created Appointment entity.
   */
  createAppointment(appointment: Appointment): Observable<Appointment> {
    return this.appointmentsEndpoint.create(appointment);
  }

  /**
   * Confirms a scheduled appointment so its consultation can be started.
   * @param appointmentId - The ID of the appointment to confirm.
   * @param patientId     - The patient ID, validated against the appointment owner.
   * @returns Stream with the confirmed Appointment entity.
   */
  confirmAppointment(appointmentId: number, patientId: number): Observable<Appointment> {
    return this.http
      .put<AppointmentResource>(
        `${environment.backendBasePath}${environment.backendAppointmentsEndpointPath}/${appointmentId}/confirm`,
        { patientId },
      )
      .pipe(map((r) => new AppointmentAssembler().toEntityFromResource(r)));
  }

  /**
   * Cancels an appointment. The endpoint returns no body on success.
   * @param appointmentId      - The ID of the appointment to cancel.
   * @param patientId          - The patient ID, validated against the appointment owner.
   * @param cancellationReason - The reason provided for the cancellation.
   */
  cancelAppointmentRequest(
    appointmentId: number,
    patientId: number,
    cancellationReason: string,
  ): Observable<void> {
    return this.http.put<void>(
      `${environment.backendBasePath}${environment.backendAppointmentsEndpointPath}/${appointmentId}/cancel`,
      { patientId, cancellationReason },
    );
  }

  /**
   * Retrieves all consultations.
   * @returns Stream with the consultation collection.
   */
  getConsultations(): Observable<Consultation[]> {
    return this.http
      .get<
        ConsultationResource[]
      >(`${environment.backendBasePath}${environment.backendConsultationsEndpointPath}`)
      .pipe(
        map((resources: ConsultationResource[]) =>
          resources.map((r) => new ConsultationAssembler().toEntityFromResource(r)),
        ),
      );
  }
  /**
   * Retrieves a single consultation by ID.
   * @param id - The ID of the consultation.
   * @returns Stream with the matched Consultation entity.
   */
  getConsultation(id: number): Observable<Consultation> {
    return this.consultationsEndpoint.getById(id);
  }

  /**
   * Retrieves the consultation already started for a given appointment, if any.
   * Used to recover when a second party (patient or dermatologist) joins a call
   * after the other side has already started the consultation.
   * @param appointmentId - The appointment ID to look up.
   * @returns Stream with the matched Consultation, or null if none exists yet.
   */
  getConsultationByAppointmentId(appointmentId: number): Observable<Consultation | null> {
    return this.http
      .get<
        ConsultationResource[]
      >(`${environment.backendBasePath}${environment.backendConsultationsEndpointPath}?appointmentId=${appointmentId}`)
      .pipe(
        map((resources) =>
          resources.length > 0 ? new ConsultationAssembler().toEntityFromResource(resources[0]) : null,
        ),
        catchError(() => of(null)),
      );
  }

  /**
   * Starts a new consultation for a confirmed appointment.
   * @param appointmentId   - The confirmed appointment the consultation belongs to.
   * @param dermatologistId - The dermatologist conducting the consultation.
   * @param patientId       - The patient attending the consultation.
   * @returns Stream with the created Consultation entity.
   */
  startConsultation(
    appointmentId: number,
    dermatologistId: number,
    patientId: number,
  ): Observable<Consultation> {
    return this.http
      .post<ConsultationResource>(
        `${environment.backendBasePath}${environment.backendConsultationsEndpointPath}`,
        { appointmentId, dermatologistId, patientId },
      )
      .pipe(map((r) => new ConsultationAssembler().toEntityFromResource(r)));
  }

  /**
   * Saves clinical notes progressively during an in-progress consultation.
   * @param consultationId - The consultation to update.
   * @param notes          - The notes text to persist.
   * @returns Stream with the updated Consultation entity.
   */
  saveConsultationNotes(consultationId: number, notes: string): Observable<Consultation> {
    return this.http
      .put<ConsultationResource>(
        `${environment.backendBasePath}${environment.backendConsultationsEndpointPath}/${consultationId}/save-notes`,
        { notes },
      )
      .pipe(map((r) => new ConsultationAssembler().toEntityFromResource(r)));
  }

  /**
   * Finishes and closes a consultation session. Completes the associated
   * appointment automatically on the backend.
   * @param consultationId  - The consultation to finish.
   * @param dermatologistId - The dermatologist closing the session.
   * @returns Stream with the finished Consultation entity.
   */
  finishConsultation(consultationId: number, dermatologistId: number): Observable<Consultation> {
    return this.http
      .put<ConsultationResource>(
        `${environment.backendBasePath}${environment.backendConsultationsEndpointPath}/${consultationId}/finish`,
        { dermatologistId },
      )
      .pipe(map((r) => new ConsultationAssembler().toEntityFromResource(r)));
  }

  getAppointmentsByDermatologistId(dermatologistId: number): Observable<Appointment[]> {
    return this.http
      .get<
        AppointmentResource[]
      >(`${environment.backendBasePath}${environment.backendAppointmentsEndpointPath}?dermatologistId=${dermatologistId}`)
      .pipe(
        map((resources: AppointmentResource[]) =>
          resources.map((r) => new AppointmentAssembler().toEntityFromResource(r)),
        ),
      );
  }

  getAppointmentsByPatientId(patientId: number): Observable<Appointment[]> {
    return this.http
      .get<
        AppointmentResource[]
      >(`${environment.backendBasePath}${environment.backendAppointmentsEndpointPath}?patientId=${patientId}`)
      .pipe(
        map((resources: AppointmentResource[]) =>
          resources.map((r) => new AppointmentAssembler().toEntityFromResource(r)),
        ),
      );
  }

}
