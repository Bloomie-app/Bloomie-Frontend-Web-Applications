import { computed, DestroyRef, effect, inject, Injectable, Signal, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, retry, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FacialScan, FacialScanStatus } from '../domain/model/facial-scan.entity';
import { SkinProfile } from '../domain/model/skin-profile.entity';
import { SkinAnalysis } from '../domain/model/skin-analysis.entity';
import { SkinAnalysisApi } from '../infrastructure/skin-analysis-api';
import { IamStore } from '../../iam/application/iam.store';

@Injectable({ providedIn: 'root' })
export class SkinAnalysisStore {
  private readonly facialScansSignal         = signal<FacialScan[]>([]);
  private readonly currentScanSignal         = signal<FacialScan | null>(null);
  private readonly currentScanAnalysisSignal = signal<SkinAnalysis | null>(null);
  private readonly latestScanAnalysisSignal  = signal<SkinAnalysis | null>(null);
  private readonly skinAnalysesSignal        = signal<SkinAnalysis[]>([]);
  private readonly skinProfileSignal         = signal<SkinProfile | null>(null);
  private readonly loadingSignal             = signal<boolean>(false);
  private readonly errorSignal               = signal<string | null>(null);

  readonly facialScans         = this.facialScansSignal.asReadonly();
  readonly currentScan         = this.currentScanSignal.asReadonly();
  readonly currentScanAnalysis = this.currentScanAnalysisSignal.asReadonly();
  readonly latestScanAnalysis  = this.latestScanAnalysisSignal.asReadonly();
  readonly skinAnalyses        = this.skinAnalysesSignal.asReadonly();
  readonly skinProfile         = this.skinProfileSignal.asReadonly();
  readonly loading             = this.loadingSignal.asReadonly();
  readonly error               = this.errorSignal.asReadonly();

  readonly latestCompletedScan = computed((): FacialScan | null => {
    const completed = this.facialScansSignal().filter(s => s.isCompleted);
    if (completed.length === 0) return null;
    return completed.reduce((latest, scan) =>
      new Date(scan.scannedAt) > new Date(latest.scannedAt) ? scan : latest,
    );
  });

  readonly completedScanCount = computed(
    () => this.facialScansSignal().filter(s => s.isCompleted).length,
  );

  readonly overallScoreImprovement = computed((): number => {
    const analyses = this.skinAnalysesSignal();
    if (analyses.length < 2) return 0;
    const sorted = [...analyses].sort(
      (a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime()
    );
    const first  = sorted[0].overallScore;
    const latest = sorted[sorted.length - 1].overallScore;
    return Math.round(latest - first);
  });

  readonly adherenceRate = computed((): number => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    const recent = this.facialScansSignal().filter(scan => {
      if (!scan.isCompleted) return false;
      const date = new Date(scan.scannedAt);
      return date >= thirtyDaysAgo && date <= today;
    });
    return Math.min(Math.round((recent.length / 4) * 100), 100);
  });

  readonly currentStreak = computed((): number => {
    const completed = this.facialScansSignal().filter(s => s.isCompleted);
    if (completed.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const checkDate = new Date(today);
    const scannedDates = new Set(
      completed.map(scan => {
        const d = new Date(scan.scannedAt);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().split('T')[0];
      }),
    );
    while (true) {
      const key = checkDate.toISOString().split('T')[0];
      if (!scannedDates.has(key)) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly iamStore   = inject(IamStore);
  private loadedForPatientId: number | null = null;

  constructor(private skinAnalysisApi: SkinAnalysisApi) {
    effect(() => {
      const user = this.iamStore.currentUser();
      untracked(() => {
        if (user && user.id !== this.loadedForPatientId) {
          this.loadedForPatientId = user.id;
          this.loadFacialScansByPatientId(user.id);
          this.loadSkinProfileByPatientId(user.id);
        }
      });
    });
  }

  getFacialScanById(id: number): Signal<FacialScan | undefined> {
    return computed(() =>
      id ? this.facialScansSignal().find(scan => scan.id === id) : undefined,
    );
  }

  selectCurrentScan(scan: FacialScan): void {
    this.currentScanSignal.set(scan);
    this.currentScanAnalysisSignal.set(null);
    this.loadScanAnalysis(scan.id);
  }

  clearCurrentScan(): void {
    this.currentScanSignal.set(null);
    this.currentScanAnalysisSignal.set(null);
  }

  /**
   * Starts a new facial scan (POST) then immediately submits it (PUT /submit).
   * Sets currentScan once both steps succeed.
   */
  startAndSubmitFacialScan(patientId: number, photoUrl: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.skinAnalysisApi
      .startFacialScan(patientId)
      .pipe(
        switchMap(created =>
          this.skinAnalysisApi.submitFacialScan(created.id, photoUrl),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: submittedScan => {
          this.facialScansSignal.update(scans => [...scans, submittedScan]);
          this.currentScanSignal.set(submittedScan);
          this.currentScanAnalysisSignal.set(null);
          this.loadingSignal.set(false);
          this.loadScanAnalysis(submittedScan.id);
        },
        error: err => {
          this.errorSignal.set(this.formatError(err, 'Failed to submit facial scan'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Loads the SkinAnalysis scores for a completed facial scan.
   * Used by the scan-result view to display metric scores.
   */
  loadScanAnalysis(facialScanId: number): void {
    this.loadingSignal.set(true);
    this.skinAnalysisApi
      .getSkinAnalysisByFacialScanId(facialScanId)
      .pipe(
        retry({ count: 3, delay: 2000 }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: analysis => {
          this.currentScanAnalysisSignal.set(analysis);
          this.latestScanAnalysisSignal.set(analysis);
          this.skinAnalysesSignal.update(analyses => {
            const others = analyses.filter(a => a.facialScanId !== analysis.facialScanId);
            return [...others, analysis];
          });
          this.loadingSignal.set(false);
        },
        error: err => {
          this.errorSignal.set(this.formatError(err, 'Failed to load scan analysis'));
          this.loadingSignal.set(false);
        },
      });
  }
  updateSkinProfile(skinProfile: SkinProfile): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.skinAnalysisApi
      .updateSkinProfile(skinProfile)
      .pipe(retry(2))
      .subscribe({
        next: updated => {
          this.skinProfileSignal.set(updated);
          this.loadingSignal.set(false);
        },
        error: err => {
          this.errorSignal.set(this.formatError(err, 'Failed to update skin profile'));
          this.loadingSignal.set(false);
        },
      });
  }

  private loadFacialScansByPatientId(patientId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.skinAnalysisApi
      .getFacialScansByPatientId(patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: scans => {
          this.facialScansSignal.set(scans);
          const latest = this.latestCompletedScan();
          this.currentScanSignal.set(latest);
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
          this.loadAllCompletedAnalyses(scans);
          if (latest) {
            this.loadLatestScanAnalysis(latest.id);
          }
        },
        error: err => {
          this.loadingSignal.set(false);
          if (err instanceof Error && err.message.includes('Resource not found')) {
            this.facialScansSignal.set([]);
          } else {
            this.errorSignal.set(this.formatError(err, 'Failed to load facial scans'));
          }
        },
      });
  }

  private loadAllCompletedAnalyses(scans: FacialScan[]): void {
    const completed = scans.filter(s => s.isCompleted);
    if (completed.length === 0) {
      this.skinAnalysesSignal.set([]);
      return;
    }
    const requests = completed.map(scan =>
      this.skinAnalysisApi
        .getSkinAnalysisByFacialScanId(scan.id)
        .pipe(catchError(() => of(null))),
    );
    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: results => {
          this.skinAnalysesSignal.set(
            results.filter((a): a is SkinAnalysis => a !== null),
          );
        },
      });
  }

  private loadLatestScanAnalysis(facialScanId: number): void {
    this.skinAnalysisApi
      .getSkinAnalysisByFacialScanId(facialScanId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: analysis => this.latestScanAnalysisSignal.set(analysis),
        error: () => this.latestScanAnalysisSignal.set(null),
      });
  }

  private loadSkinProfileByPatientId(patientId: number): void {
    this.loadingSignal.set(true);
    this.skinAnalysisApi
      .getSkinProfileByPatientId(patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: profile => {
          this.skinProfileSignal.set(profile);
          this.loadingSignal.set(false);
        },
        error: () => {
          this.skinProfileSignal.set(null);
          this.loadingSignal.set(false);
        },
      });
  }

  private formatError(error: unknown, fallback: string): string {
    if (error instanceof Error) {
      return error.message.includes('Resource not found')
        ? `${fallback}: Not found`
        : error.message;
    }
    return fallback;
  }
}
