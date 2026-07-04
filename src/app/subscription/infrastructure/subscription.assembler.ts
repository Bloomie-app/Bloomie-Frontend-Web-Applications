import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { Subscription, SubscriptionStatus } from '../domain/model/subscription.entity';
import { SubscriptionResource } from './subscription.response';

/**
 * Maps Subscription entities to and from API resources.
 */
export class SubscriptionAssembler implements BaseAssembler<Subscription, SubscriptionResource, BaseResponse> {
  toEntityFromResource(resource: SubscriptionResource): Subscription {
    return new Subscription({
      id: resource.id,
      patientId: resource.patientId,
      planId: resource.planId,
      status: resource.status as SubscriptionStatus,
      startDate: resource.startDate,
      endDate: resource.endDate,
    });
  }

  toResourceFromEntity(entity: Subscription): SubscriptionResource {
    return {
      id: entity.id,
      patientId: entity.patientId,
      planId: entity.planId,
      status: entity.status,
      startDate: entity.startDate,
      endDate: entity.endDate,
    };
  }

  toEntitiesFromResponse(_response: BaseResponse): Subscription[] {
    return [];
  }
}
