import {BaseApiEndpoint} from '../../shared/infrastructure/base-api-endpoint';
import {Appointment} from '../domain/model/appointment.entity';
import {AppointmentResource, AppointmentsResponse} from './appointment.response';
import {AppointmentAssembler} from './appointment.assembler';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

/**
 * Endpoint client for appointment CRUD operations.
 */
export class AppointmentsApiEndpoint extends BaseApiEndpoint<
  Appointment,
  AppointmentResource,
  AppointmentsResponse,
  AppointmentAssembler
> {
  /**
   * Creates an instance of AppointmentsApiEndpoint.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.backendBasePath}${environment.backendAppointmentsEndpointPath}`,
      new AppointmentAssembler(),
    );
  }
}
