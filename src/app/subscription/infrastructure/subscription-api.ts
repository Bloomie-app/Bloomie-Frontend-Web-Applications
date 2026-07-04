import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Subscription } from '../domain/model/subscription.entity';
import { SubscriptionApiEndpoint } from './subscription-api-endpoint';

/**
 * Infrastructure facade for subscription operations, exposed to the
 * application layer ({@link SubscriptionStore}).
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionApi extends BaseApi {
  private readonly endpoint: SubscriptionApiEndpoint;

  constructor(http: HttpClient) {
    super();
    this.endpoint = new SubscriptionApiEndpoint(http);
  }

  getByPatientId(patientId: number): Observable<Subscription | null> {
    return this.endpoint.getByPatientId(patientId);
  }

  /** Cancels a subscription. Backend soft-cancels it (status -> CANCELLED); the row is kept. */
  cancel(subscriptionId: number): Observable<void> {
    return this.endpoint.delete(subscriptionId);
  }

  /** Switches a subscription to a different plan. */
  changePlan(subscriptionId: number, newPlanId: number): Observable<Subscription> {
    return this.endpoint.changePlan(subscriptionId, newPlanId);
  }
}
