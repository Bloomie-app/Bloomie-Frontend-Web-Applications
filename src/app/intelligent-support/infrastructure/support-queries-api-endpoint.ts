import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { SupportQuery } from '../domain/model/support-query.entity';
import { SupportQueryResource, SupportQueriesResponse } from './support-query.response';
import { SupportQueryAssembler } from './support-query.assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Endpoint client for support query CRUD operations.
 */
export class SupportQueriesApiEndpoint extends BaseApiEndpoint<
  SupportQuery,
  SupportQueryResource,
  SupportQueriesResponse,
  SupportQueryAssembler
> {
  /**
   * Creates an instance of SupportQueriesApiEndpoint.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.backendBasePath}${environment.backendChatMessagesEndpointPath}`,
      new SupportQueryAssembler(),
    );
  }
}
