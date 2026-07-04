import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export enum SubscriptionStatus {
  Pending = 'PENDING',
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Expired = 'EXPIRED',
}

/**
 * Represents a patient's subscription to a Bloomie plan.
 */
export class Subscription implements BaseEntity {
  constructor(props: {
    id: number;
    patientId: number;
    planId: number;
    status: SubscriptionStatus;
    startDate: string | null;
    endDate: string | null;
  }) {
    this._id = props.id;
    this._patientId = props.patientId;
    this._planId = props.planId;
    this._status = props.status;
    this._startDate = props.startDate;
    this._endDate = props.endDate;
  }

  private _id: number;
  get id(): number { return this._id; }

  private _patientId: number;
  get patientId(): number { return this._patientId; }

  private _planId: number;
  get planId(): number { return this._planId; }

  private _status: SubscriptionStatus;
  get status(): SubscriptionStatus { return this._status; }

  private _startDate: string | null;
  get startDate(): string | null { return this._startDate; }

  private _endDate: string | null;
  get endDate(): string | null { return this._endDate; }

  /**
   * Cancelling only stops auto-renewal server-side — the subscription stays
   * terminal (CANCELLED) but the patient keeps access until the already-paid
   * `endDate` elapses.
   */
  grantsAccess(now: Date = new Date()): boolean {
    if (this._status === SubscriptionStatus.Active || this._status === SubscriptionStatus.Pending) return true;
    if (this._status === SubscriptionStatus.Cancelled && this._endDate) {
      return new Date(this._endDate).getTime() > now.getTime();
    }
    return false;
  }
}
