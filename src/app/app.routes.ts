import { Routes } from '@angular/router';
import { subscriptionGuard } from './subscription/presentation/guards/subscription.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'iam',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./dashboard/presentation/dashboard.routes').then((module) => module.dashboardRoutes),
    canActivate: [subscriptionGuard],
  },
  {
    path: 'iam',
    loadChildren: () => import('./iam/presentation/iam.routes').then((m) => m.iamRoutes),
  },
  {
    path: 'dermatology',
    loadChildren: () =>
      import('./dermatology-care/presentation/dermatology-care.routes').then(
        (module) => module.dermatologyCareRoutes,
      ),
    canActivate: [subscriptionGuard],
  },
  {
    path: 'routine',
    loadChildren: () =>
      import('./routine-management/presentation/routine-management.routes').then(
        (module) => module.routineManagementRoutes,
      ),
    canActivate: [subscriptionGuard],
  },
  {
    path: 'derm',
    loadChildren: () =>
      import('./dermatology-care/presentation/dermatology-care.routes').then(
        (module) => module.dermRoutes,
      ),
  },
  {
    path: 'consult',
    loadChildren: () =>
      import('./intelligent-support/presentation/intelligent-support.routes').then(
        (module) => module.intelligentSupportRoutes,
      ),
    canActivate: [subscriptionGuard],
  },
  {
    path: 'trending',
    loadChildren: () =>
      import('./product-discovery/presentation/product-discovery.routes').then(
        (module) => module.productDiscoveryRoutes,
      ),
    canActivate: [subscriptionGuard],
  },
  {
    path: 'skin-analysis',
    loadChildren: () =>
      import('./skin-analysis/presentation/skin-analysis.routes').then(
        (module) => module.skinAnalysisRoutes,
      ),
  },
  {
    path: 'profile',
    loadChildren: () => import('./iam/presentation/iam.routes').then((m) => m.profileRoutes),
  },
  { path: '**', redirectTo: 'dashboard' },
];
