import {BaseResource, BaseResponse} from '../../shared/infrastructure/base-response';

/**
 * Resource representation of a consultation returned by the API.
 */
export interface ConsultationResource extends BaseResource {
  id:                   number;
  // snake_case (mock API)
  appointment_id?:      number;
  patient_id?:          number;
  dermatologist_id?:    number;
  clinical_photo_urls?: string[];
  notes:                string;
  recommendations:      string;
  status:               string;
  started_at?:          string;
  finished_at?:         string;
  // camelCase (real backend)
  appointmentId?:       number;
  patientId?:           number;
  dermatologistId?:     number;
  clinicalPhotoUrls?:   string[];
  startedAt?:           string;
  finishedAt?:          string;
}

/**
 * Response envelope for consultation collection queries.
 */
export interface ConsultationsResponse extends BaseResponse {
  /** The list of consultations returned by the API. */
  consultations: ConsultationResource[];
}
