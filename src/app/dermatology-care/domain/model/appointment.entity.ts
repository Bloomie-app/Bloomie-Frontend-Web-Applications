import {BaseEntity} from '../../../shared/infrastructure/base-entity';

/**
 * Represents the lifecycle states of a dermatologist appointment.
 */
export enum AppointmentStatus {
  Scheduled  = 'SCHEDULED',
  Confirmed  = 'CONFIRMED',
  InProgress = 'IN_PROGRESS',
  Completed  = 'COMPLETED',
  Cancelled  = 'CANCELLED',
}

/**
 * Represents a scheduled appointment between a patient and a dermatologist.
 */
export class Appointment implements BaseEntity {

  /**
   * Creates a new Appointment entity.
   * @param props - Initialization values for the appointment.
   */
  constructor(props: {
    id:                  number;
    patientId:           number;
    dermatologistId:     number;
    scheduledAt:         string;
    status:              AppointmentStatus;
    cancellationReason:  string;
  }) {
    this._id                 = props.id;
    this._patientId          = props.patientId;
    this._dermatologistId    = props.dermatologistId;
    this._scheduledAt        = props.scheduledAt;
    this._status             = props.status;
    this._cancellationReason = props.cancellationReason;
  }

  /** Unique identifier for the appointment. */
  private _id: number;

  get id(): number { return this._id; }
  set id(value: number) { this._id = value; }

  /** Identifier of the patient who booked the appointment. */
  private _patientId: number;

  get patientId(): number { return this._patientId; }

  /** Identifier of the dermatologist assigned to the appointment. */
  private _dermatologistId: number;

  get dermatologistId(): number { return this._dermatologistId; }

  /** ISO 8601 date-time string for when the appointment is scheduled. */
  private _scheduledAt: string;

  get scheduledAt(): string { return this._scheduledAt; }

  /** Current lifecycle status of the appointment. */
  private _status: AppointmentStatus;

  get status(): AppointmentStatus { return this._status; }
  set status(value: AppointmentStatus) { this._status = value; }

  /** Reason provided when the appointment was cancelled, empty otherwise. */
  private _cancellationReason: string;

  get cancellationReason(): string { return this._cancellationReason; }
  set cancellationReason(value: string) { this._cancellationReason = value; }

  /**
   * Returns true if the appointment is eligible for a full refund on cancellation.
   * Cancellations made at least 24 hours before the scheduled time qualify.
   */
  get isEligibleForRefund(): boolean {
    const scheduledDate   = new Date(this._scheduledAt);
    const now             = new Date();
    const hoursUntilStart = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilStart >= 24;
  }

  /**
   * Returns true if the appointment is confirmed and ready to start.
   */
  get isConfirmed(): boolean {
    return this._status === AppointmentStatus.Confirmed;
  }

  /**
   * Returns true if the appointment has been cancelled.
   */
  get isCancelled(): boolean {
    return this._status === AppointmentStatus.Cancelled;
  }

  /**
   * Returns a display-friendly formatted date string for the appointment.
   * @returns Formatted date as 'MMM DD, YYYY HH:mm'.
   */
  get formattedScheduledAt(): string {
    return new Date(this._scheduledAt).toLocaleString('en-US', {
      month:  'short',
      day:    '2-digit',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  }
}
