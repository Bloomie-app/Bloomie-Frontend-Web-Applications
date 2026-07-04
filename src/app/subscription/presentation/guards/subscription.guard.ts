import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { IamStore } from '../../../iam/application/iam.store';
import { UserRole } from '../../../iam/domain/model/user.entity';
import { SubscriptionStore } from '../../application/subscription.store';

/**
 * Blocks access to the paid areas of the app for young adults whose
 * subscription no longer grants access (never subscribed, expired, or
 * cancelled past its paid `endDate`), sending them back to plan selection.
 * Dermatologists don't hold subscriptions and are unaffected.
 */
export const subscriptionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const iamStore = inject(IamStore);
  const subscriptionStore = inject(SubscriptionStore);
  const router = inject(Router);

  const user = iamStore.currentUser();
  if (!user || user.role !== UserRole.YoungAdult) return true;

  // Mid Stripe-return: let dashboard-home's own post-checkout handling run
  // before we require a freshly-created subscription to already be readable.
  if (route.queryParamMap.has('session_id')) return true;

  return subscriptionStore.loadForPatient(user.id).pipe(
    map(() => {
      // Fail open on infrastructure errors (backend down/unreachable) — only
      // redirect when we could actually confirm access is no longer granted.
      if (subscriptionStore.error()) return true;
      return subscriptionStore.hasActiveAccess()
        ? true
        : router.createUrlTree(['/iam/select-plan'], { queryParams: { reason: 'subscription-ended' } });
    }),
  );
};
