import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface SupportQueryResource extends BaseResource {
  id: number;
  patientId: number;
  skinProfileId: number;
  status: string;
  suggestedAction: string;
  createdAt: string;
}

export interface SupportQueriesResponse extends BaseResponse {
  support_queries: SupportQueryResource[];
}
