import {BaseAssembler} from '../../shared/infrastructure/base-assembler';
import {Consultation, ConsultationStatus} from '../domain/model/consultation.entity';
import {ConsultationResource, ConsultationsResponse} from './consultation.response';

/**
 * Maps Consultation entities to and from API resources.
 */
export class ConsultationAssembler implements BaseAssembler<Consultation, ConsultationResource, ConsultationsResponse> {

  /**
   * Converts a ConsultationsResponse to an array of Consultation entities.
   * @param response - The API response containing consultations.
   * @returns An array of Consultation entities.
   */
  toEntitiesFromResponse(response: ConsultationsResponse): Consultation[] {
    return response.consultations.map(resource => this.toEntityFromResource(resource));
  }

  /**
   * Converts a ConsultationResource to a Consultation entity.
   * @param resource - The resource to convert.
   * @returns The converted Consultation entity.
   */
  toEntityFromResource(resource: ConsultationResource): Consultation {
    return new Consultation({
      id:                resource.id,
      appointmentId:     resource.appointmentId     ?? resource.appointment_id     ?? 0,
      patientId:         resource.patientId         ?? resource.patient_id         ?? 0,
      dermatologistId:   resource.dermatologistId   ?? resource.dermatologist_id   ?? 0,
      clinicalPhotoUrls: resource.clinicalPhotoUrls ?? resource.clinical_photo_urls ?? [],
      notes:             resource.notes,
      recommendations:   resource.recommendations,
      status:            resource.status as ConsultationStatus,
      startedAt:         resource.startedAt         ?? resource.started_at         ?? '',
      finishedAt:        resource.finishedAt        ?? resource.finished_at        ?? '',
    });
  }

  /**
   * Converts a Consultation entity to a ConsultationResource.
   * @param entity - The entity to convert.
   * @returns The converted ConsultationResource.
   */
  toResourceFromEntity(entity: Consultation): ConsultationResource {
    return {
      id:                entity.id,
      appointmentId:     entity.appointmentId,
      patientId:         entity.patientId,
      dermatologistId:   entity.dermatologistId,
      clinicalPhotoUrls: entity.clinicalPhotoUrls,
      notes:             entity.notes,
      recommendations:   entity.recommendations,
      status:            entity.status,
      startedAt:         entity.startedAt,
      finishedAt:        entity.finishedAt,
    } as ConsultationResource;
  }
}
