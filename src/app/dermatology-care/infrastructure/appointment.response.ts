import {BaseResource, BaseResponse} from '../../shared/infrastructure/base-response';

/**
 * Resource representation of an appointment returned by the API.
 */
export interface AppointmentResource extends BaseResource {
  id:                 number;
  patientId:          number;
  dermatologistId:    number;
  paymentId:          number;
  scheduledAt:        string;
  status:             string;
  cancellationReason: string;
}

export interface AppointmentsResponse extends BaseResponse {
  appointments: AppointmentResource[];
}
