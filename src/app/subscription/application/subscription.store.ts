import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { SubscriptionApi } from '../infrastructure/subscription-api';
import { Subscription, SubscriptionStatus } from '../domain/model/subscription.entity';

/**
 * Holds the current patient's subscription state and coordinates
 * cancellation across the app (my-plan settings page, access guards).
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionStore {
  private readonly subscriptionApi = inject(SubscriptionApi);

  private readonly currentSubscriptionSignal = signal<Subscription | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly loadedForPatientIdSignal = signal<number | null>(null);

  readonly currentSubscription = this.currentSubscriptionSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** Whether the loaded subscription still grants access to the paid app. */
  readonly hasActiveAccess = computed(() => {
    const subscription = this.currentSubscriptionSignal();
    return subscription ? subscription.grantsAccess() : false;
  });

  /**
   * Fetches the subscription for a patient, reusing the cached value when
   * already loaded for the same patient.
   * @param patientId - The patient identifier to load the subscription for.
   * @param force - When true, bypasses the cache and re-queries the backend
   *                (e.g. right after a Stripe checkout, when a prior check may
   *                have cached a stale "no subscription yet" result).
   */
  loadForPatient(patientId: number, force = false): Observable<Subscription | null> {
    if (!force && this.loadedForPatientIdSignal() === patientId && !this.errorSignal()) {
      return of(this.currentSubscriptionSignal());
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.subscriptionApi.getByPatientId(patientId).pipe(
      tap((subscription) => {
        this.currentSubscriptionSignal.set(subscription);
        this.loadedForPatientIdSignal.set(patientId);
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.errorSignal.set(err?.message ?? 'Failed to load subscription');
        this.loadingSignal.set(false);
        return of(null);
      }),
    );
  }

  /** Cancels the currently loaded subscription. */
  cancel(): Observable<void> {
    const subscription = this.currentSubscriptionSignal();
    if (!subscription) {
      return throwError(() => new Error('No active subscription to cancel'));
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.subscriptionApi.cancel(subscription.id).pipe(
      tap(() => {
        this.currentSubscriptionSignal.set(
          new Subscription({
            id: subscription.id,
            patientId: subscription.patientId,
            planId: subscription.planId,
            status: SubscriptionStatus.Cancelled,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
          }),
        );
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.errorSignal.set(err?.message ?? 'Failed to cancel subscription');
        this.loadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }

  /** Switches the currently loaded subscription to a different plan. */
  changePlan(newPlanId: number): Observable<Subscription> {
    const subscription = this.currentSubscriptionSignal();
    if (!subscription) {
      return throwError(() => new Error('No active subscription to change plan on'));
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.subscriptionApi.changePlan(subscription.id, newPlanId).pipe(
      tap((updated) => {
        this.currentSubscriptionSignal.set(updated);
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.errorSignal.set(err?.message ?? 'Failed to change subscription plan');
        this.loadingSignal.set(false);
        return throwError(() => err);
      }),
    );
  }
}
