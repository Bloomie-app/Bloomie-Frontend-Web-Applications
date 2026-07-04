import {BaseApiEndpoint} from '../../shared/infrastructure/base-api-endpoint';
import {Consultation} from '../domain/model/consultation.entity';
import {ConsultationResource, ConsultationsResponse} from './consultation.response';
import {ConsultationAssembler} from './consultation.assembler';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

/**
 * Endpoint client for consultation CRUD operations.
 */
export class ConsultationsApiEndpoint extends BaseApiEndpoint<
  Consultation,
  ConsultationResource,
  ConsultationsResponse,
  ConsultationAssembler
> {
  /**
   * Creates an instance of ConsultationsApiEndpoint.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.backendBasePath}${environment.backendConsultationsEndpointPath}`,
      new ConsultationAssembler(),
    );
  }
}
