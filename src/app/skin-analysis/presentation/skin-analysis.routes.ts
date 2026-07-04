import { Routes } from '@angular/router';

const skinScanHome = () =>
  import('./views/skin-scan-home/skin-scan-home').then((m) => m.SkinScanHome);
const scanPrepare = () => import('./views/scan-prepare/scan-prepare').then((m) => m.ScanPrepare);
const scanProgress = () =>
  import('./views/scan-progress/scan-progress').then((m) => m.ScanProgress);
const scanAnalyzing = () =>
  import('./views/scan-analyzing/scan-analyzing').then((m) => m.ScanAnalyzing);
const scanResult = () => import('./views/scan-result/scan-result').then((m) => m.ScanResult);
const scanError = () => import('./views/scan-error/scan-error').then((m) => m.ScanError);
const pastAnalyses = () =>
  import('./views/past-analyses/past-analyses').then((m) => m.PastAnalyses);
const skinProgress = () =>
  import('./views/skin-progress/skin-progress').then((m) => m.SkinProgress);

/**
 * Route tree for skin analysis presentation views — under /skin-analysis.
 */
export const skinAnalysisRoutes: Routes = [
  { path: '', loadComponent: skinScanHome },
  { path: 'prepare', loadComponent: scanPrepare },
  { path: 'progress', loadComponent: scanProgress },
  { path: 'analyzing', loadComponent: scanAnalyzing },
  { path: 'result', loadComponent: scanResult },
  { path: 'error', loadComponent: scanError },
  { path: 'past-analyses', loadComponent: pastAnalyses },
  { path: 'skin-progress', loadComponent: skinProgress },
  {
    path: 'onboarding-scan',
    loadComponent: () =>
      import('./views/onboarding-scan/onboarding-scan').then((m) => m.OnboardingScan),
  },
];
