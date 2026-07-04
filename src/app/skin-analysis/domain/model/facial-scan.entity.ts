import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export enum FacialScanStatus {
  Started = 'STARTED',
  Submitted = 'SUBMITTED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}

export class FacialScan implements BaseEntity {
  constructor(props: {
    id: number;
    patientId: number;
    status: FacialScanStatus;
    photoUrl: string;
    scannedAt: string;
  }) {
    this._id = props.id;
    this._patientId = props.patientId;
    this._status = props.status;
    this._photoUrl = props.photoUrl;
    this._scannedAt = props.scannedAt;
  }

  private _id: number;

  get id(): number {
    return this._id;
  }
  set id(value: number) {
    this._id = value;
  }

  private _patientId: number;

  get patientId(): number {
    return this._patientId;
  }

  private _status: FacialScanStatus;

  get status(): FacialScanStatus {
    return this._status;
  }
  set status(value: FacialScanStatus) {
    this._status = value;
  }

  private _photoUrl: string;

  get photoUrl(): string {
    return this._photoUrl;
  }

  private _scannedAt: string;

  get scannedAt(): string {
    return this._scannedAt;
  }

  get isCompleted(): boolean {
    return (
      this._status === FacialScanStatus.Submitted || this._status === FacialScanStatus.Completed
    );
  }

  get hasFailed(): boolean {
    return this._status === FacialScanStatus.Failed;
  }

  get isInProgress(): boolean {
    return this._status === FacialScanStatus.Started;
  }

  get formattedScannedAt(): string {
    return new Date(this._scannedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }
}
