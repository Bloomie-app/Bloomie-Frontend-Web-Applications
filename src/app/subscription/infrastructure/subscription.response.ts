import { BaseResource } from '../../shared/infrastructure/base-response';

/**
 * Resource representation of a subscription as returned by the backend
 * `SubscriptionController` (`/api/v1/subscriptions`).
 */
export interface SubscriptionResource extends BaseResource {
  id: number;
  patientId: number;
  planId: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
}
