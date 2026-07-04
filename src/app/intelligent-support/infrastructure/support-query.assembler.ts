import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import {
  SupportQuery,
  SuggestedAction,
  SupportQueryStatus,
} from '../domain/model/support-query.entity';
import { SupportQueryResource, SupportQueriesResponse } from './support-query.response';

/**
 * Maps SupportQuery entities to and from API resources.
 */
export class SupportQueryAssembler implements BaseAssembler<
  SupportQuery,
  SupportQueryResource,
  SupportQueriesResponse
> {
  /**
   * Converts a SupportQueriesResponse to an array of SupportQuery entities.
   * @param response - The API response containing support queries.
   * @returns An array of SupportQuery entities.
   */
  toEntitiesFromResponse(response: SupportQueriesResponse): SupportQuery[] {
    return response.support_queries.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: SupportQueryResource): SupportQuery {
    return new SupportQuery({
      id: resource.id,
      userId: resource.patientId,
      skinProfileId: resource.skinProfileId,
      lastFacialScanId: 0,
      suggestedAction: resource.suggestedAction as SuggestedAction,
      status: resource.status as SupportQueryStatus,
      createdAt: resource.createdAt,
    });
  }

  toResourceFromEntity(entity: SupportQuery): SupportQueryResource {
    return {
      id: entity.id,
      patientId: entity.userId,
      skinProfileId: entity.skinProfileId,
      status: entity.status,
      suggestedAction: entity.suggestedAction,
      createdAt: entity.createdAt,
    } as SupportQueryResource;
  }
}
