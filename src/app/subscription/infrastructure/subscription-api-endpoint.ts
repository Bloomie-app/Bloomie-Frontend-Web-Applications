import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { Subscription } from '../domain/model/subscription.entity';
import { SubscriptionResource } from './subscription.response';
import { SubscriptionAssembler } from './subscription.assembler';

/**
 * Endpoint client for subscription operations against the backend
 * `SubscriptionController` (`/api/v1/subscriptions`).
 */
export class SubscriptionApiEndpoint extends BaseApiEndpoint<
  Subscription,
  SubscriptionResource,
  BaseResponse,
  SubscriptionAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.backendBasePath}${environment.backendSubscriptionsEndpointPath}`,
      new SubscriptionAssembler(),
    );
  }

  /**
   * Looks up the subscription owned by a patient (IAM user id). Resolves to
   * `null` when the patient has never subscribed (backend returns 404).
   */
  getByPatientId(patientId: number): Observable<Subscription | null> {
    return this.http.get<SubscriptionResource>(`${this.endpointUrl}/patient/${patientId}`).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) return of(null);
        return this.handleError('Failed to fetch subscription')(error);
      }),
    );
  }

  /**
   * Switches a subscription to a different plan (`PATCH .../{id}/change-plan`).
   * The backend rejects this with 409 when already on that plan, and with 400
   * when the subscription is CANCELLED/EXPIRED.
   */
  changePlan(subscriptionId: number, newPlanId: number): Observable<Subscription> {
    return this.http
      .patch<SubscriptionResource>(`${this.endpointUrl}/${subscriptionId}/change-plan`, { newPlanId })
      .pipe(
        map((resource) => this.assembler.toEntityFromResource(resource)),
        catchError(this.handleError('Failed to change subscription plan')),
      );
  }
}
