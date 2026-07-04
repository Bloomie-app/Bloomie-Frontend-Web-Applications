import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IamStore } from '../../../iam/application/iam.store';

/**
 * Blocks access to the dermatologist portal until the profile setup wizard
 * (`/derm/setup`) has been completed, redirecting there otherwise.
 */
export const dermSetupGuard: CanActivateFn = () => {
  const iamStore = inject(IamStore);
  const router = inject(Router);

  const user = iamStore.currentUser();
  if (!user) return true;

  const setupCompleted = localStorage.getItem(`bloomie_setup_${user.id}`) === 'true';
  return setupCompleted ? true : router.createUrlTree(['/derm/setup']);
};
