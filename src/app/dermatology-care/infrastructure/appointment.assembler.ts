import {BaseAssembler} from '../../shared/infrastructure/base-assembler';
import {Appointment, AppointmentStatus} from '../domain/model/appointment.entity';
import {AppointmentResource, AppointmentsResponse} from './appointment.response';

/**
 * Maps Appointment entities to and from API resources.
 */
export class AppointmentAssembler implements BaseAssembler<
  Appointment,
  AppointmentResource,
  AppointmentsResponse
> {
  /**
   * Converts an AppointmentsResponse to an array of Appointment entities.
   * @param response - The API response containing appointments.
   * @returns An array of Appointment entities.
   */
  toEntitiesFromResponse(response: AppointmentsResponse): Appointment[] {
    return response.appointments.map((resource) => this.toEntityFromResource(resource));
  }

  /**
   * Converts an AppointmentResource to an Appointment entity.
   * @param resource - The resource to convert.
   * @returns The converted Appointment entity.
   */
  toEntityFromResource(resource: AppointmentResource): Appointment {
    return new Appointment({
      id: resource.id,
      patientId: resource.patientId,
      dermatologistId: resource.dermatologistId,
      paymentId: resource.paymentId,
      scheduledAt: resource.scheduledAt,
      status: resource.status as AppointmentStatus,
      cancellationReason: resource.cancellationReason,
    });
  }

  toResourceFromEntity(entity: Appointment): AppointmentResource {
    return {
      id: entity.id,
      patientId: entity.patientId,
      dermatologistId: entity.dermatologistId,
      paymentId: entity.paymentId,
      scheduledAt: entity.scheduledAt,
      status: entity.status,
      cancellationReason: entity.cancellationReason,
    } as AppointmentResource;
  }
}
