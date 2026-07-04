import { computed, DestroyRef, effect, inject, Injectable, Signal, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { retry } from 'rxjs';
import { Routine, RoutineStatus } from '../domain/model/routine.entity';
import { DailyTracking } from '../domain/model/daily-tracking.entity';
import { RoutineManagementApi } from '../infrastructure/routine-management-api';
import { IamStore } from '../../iam/application/iam.store';

/**
 * Holds routine management application state and coordinates
 * routine, routine item, and daily tracking application layer behavior.
 */
@Injectable({ providedIn: 'root' })
export class RoutineManagementStore {
  private readonly routinesSignal = signal<Routine[]>([]);
  private readonly dailyTrackingsSignal = signal<DailyTracking[]>([]);
  private readonly selectedRoutineSignal = signal<Routine | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly replacementOptionsSignal = signal<string[]>([]);

  readonly routines = this.routinesSignal.asReadonly();
  readonly dailyTrackings = this.dailyTrackingsSignal.asReadonly();
  readonly selectedRoutine = this.selectedRoutineSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly replacementOptions = this.replacementOptionsSignal.asReadonly();

  /**
   * Computed signal for the active routine.
   * A patient has at most one active routine at a time.
   */
  readonly activeRoutine = computed(() => this.routinesSignal().find((r) => r.isActive) ?? null);

  /**
   * Computed signal for the items belonging to the active routine,
   * sorted by their display order.
   * Items are embedded in the routine returned by the backend.
   */
  readonly activeRoutineItems = computed(() => {
    const active = this.activeRoutine();
    if (!active) return [];
    return [...active.items].sort((a, b) => a.order - b.order);
  });

  /**
   * Computed signal for the number of completed days in the current week
   * for the active routine (last 7 days including today).
   */
  readonly completedDaysThisWeek = computed(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    return this.dailyTrackingsSignal().filter((tracking) => {
      if (!tracking.isCompleted) return false;
      const trackingDate = new Date(tracking.date);
      return trackingDate >= weekStart && trackingDate <= today;
    }).length;
  });

  /**
   * Computed signal for the overall completion percentage of the active routine
   * based on the last 30 days. Returns a number between 0 and 100.
   */
  readonly completionPercentage = computed(() => {
    const active = this.activeRoutine();
    if (!active) return 0;
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    const trackingsInRange = this.dailyTrackingsSignal().filter((tracking) => {
      if (tracking.routineId !== active.id) return false;
      const trackingDate = new Date(tracking.date);
      return trackingDate >= thirtyDaysAgo && trackingDate <= today;
    });
    if (trackingsInRange.length === 0) return 0;
    const completedCount = trackingsInRange.filter((t) => t.isCompleted).length;
    return Math.round((completedCount / trackingsInRange.length) * 100);
  });

  /**
   * Computed signal for date strings of completed days for the active routine.
   * Used to mark days in the calendar UI.
   */
  readonly completedDays = computed((): string[] =>
    this.dailyTrackingsSignal()
      .filter((tracking) => tracking.isCompleted)
      .map((tracking) => tracking.date),
  );

  private readonly destroyRef = inject(DestroyRef);
  private readonly iamStore = inject(IamStore);
  private loadedForPatientId: number | null = null;

  constructor(private routineManagementApi: RoutineManagementApi) {
    // React to authentication state: load data when user becomes available.
    // Uses untracked to avoid reactive loops inside the effect body.
    effect(() => {
      const user = this.iamStore.currentUser();
      untracked(() => {
        if (user && user.id !== this.loadedForPatientId) {
          this.loadedForPatientId = user.id;
          this.loadRoutineByPatientId(user.id);
          this.loadDailyTrackingsByPatientId(user.id);
        }
      });
    });
  }

  /**
   * Forces a reload of the routine for the currently authenticated patient.
   * Call this after a scan is submitted so the newly generated routine is picked up.
   */
  reloadRoutine(): void {
    const user = this.iamStore.currentUser();
    if (!user) return;
    this.loadRoutineByPatientId(user.id);
  }

  /**
   * Selects a routine as the currently active selection.
   */
  selectRoutine(routine: Routine): void {
    this.selectedRoutineSignal.set(routine);
  }

  /**
   * Returns a reactive selection for a routine by identifier.
   */
  getRoutineById(id: number): Signal<Routine | undefined> {
    return computed(() => (id ? this.routinesSignal().find((r) => r.id === id) : undefined));
  }

  /**
   * Returns a reactive selection for a routine item by identifier.
   * Searches within the active routine's embedded items.
   */
  getRoutineItemById(
    id: number,
  ): Signal<import('../domain/model/routine-item.entity').RoutineItem | undefined> {
    return computed(() =>
      id ? this.activeRoutine()?.items.find((item) => item.id === id) : undefined,
    );
  }

  /**
   * Returns daily tracking records for a routine filtered to the last 7 days.
   */
  getWeeklyTrackingsForRoutine(routineId: number): Signal<DailyTracking[]> {
    return computed(() => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      return this.dailyTrackingsSignal().filter((tracking) => {
        if (tracking.routineId !== routineId) return false;
        const trackingDate = new Date(tracking.date);
        return trackingDate >= weekStart && trackingDate <= today;
      });
    });
  }

  /**
   * Loads replacement product options for a routine item.
   * Options are available via the replacementOptions signal after load.
   */
  loadReplacementOptions(routineItemId: number): void {
    const active = this.activeRoutine();
    if (!active) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.routineManagementApi
      .getReplacementOptions(active.id, routineItemId)
      .pipe(retry(2))
      .subscribe({
        next: (options) => {
          this.replacementOptionsSignal.set(options);
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load replacement options'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Replaces the product recommendation for a routine item with the chosen option.
   * Updates the routine signal with the response returned by the backend.
   */
  replaceProduct(routineItemId: number, newProductRecommendation: string): void {
    const active = this.activeRoutine();
    if (!active) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.routineManagementApi
      .replaceProduct(active.id, routineItemId, newProductRecommendation)
      .pipe(retry(2))
      .subscribe({
        next: (updatedRoutine) => {
          this.routinesSignal.update((routines) =>
            routines.map((r) => (r.id === updatedRoutine.id ? updatedRoutine : r)),
          );
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to replace product'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Removes an optional product step from the active routine.
   * Updates the routine signal with the response returned by the backend.
   */
  removeRoutineItem(routineItemId: number): void {
    const active = this.activeRoutine();
    if (!active) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.routineManagementApi
      .removeRoutineItem(active.id, routineItemId)
      .pipe(retry(2))
      .subscribe({
        next: (updatedRoutine) => {
          this.routinesSignal.update((routines) =>
            routines.map((r) => (r.id === updatedRoutine.id ? updatedRoutine : r)),
          );
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to remove routine item'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Marks the active routine as completed for the given date.
   * The backend does not support unmarking, so markDayNotCompleted is a no-op.
   */
  markDayCompleted(date: string): void {
    const active = this.activeRoutine();
    const patientId = this.iamStore.currentUser()?.id;
    if (!active || !patientId) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.routineManagementApi
      .markRoutineAsCompleted(patientId, active.id, date)
      .pipe(retry(2))
      .subscribe({
        next: (createdId) => {
          if (createdId === -1) {
            const userId = this.iamStore.currentUser()?.id;
            if (userId) this.loadDailyTrackingsByPatientId(userId);
            this.loadingSignal.set(false);
            return;
          }
          const newTracking = new DailyTracking({
            id: createdId,
            patientId,
            routineId: active.id,
            date,
            isCompleted: true,
            completedAt: new Date().toISOString(),
          });
          this.dailyTrackingsSignal.update((trackings) => [...trackings, newTracking]);
          this.loadingSignal.set(false);
        },
        error: (err) => {
          if (err instanceof Error && err.message.includes('Conflict')) {
            const patientId = this.iamStore.currentUser()?.id;
            if (patientId) this.loadDailyTrackingsByPatientId(patientId);
          } else {
            this.errorSignal.set(this.formatError(err, 'Failed to mark day as completed'));
          }
          this.loadingSignal.set(false);
        },
      });
  }

  markDayNotCompleted(_date: string): void {
    // The backend does not expose an endpoint to unmark a completed day.
  }

  /**
   * Loads the active routine for a patient from the backend.
   * A 404 means no routine has been generated yet — treated as an empty state, not an error.
   */
  private loadRoutineByPatientId(patientId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.routineManagementApi
      .getRoutineByPatientId(patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (routine) => {
          this.routinesSignal.set([routine]);
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.loadingSignal.set(false);
          if (err instanceof Error && err.message.includes('Resource not found')) {
            this.routinesSignal.set([]);
          } else {
            this.errorSignal.set(this.formatError(err, 'Failed to load routine'));
          }
        },
      });
  }

  /**
   * Loads all daily tracking records for a patient from the backend.
   */
  private loadDailyTrackingsByPatientId(patientId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.routineManagementApi
      .getDailyTrackingsByPatientId(patientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dailyTrackings) => {
          this.dailyTrackingsSignal.set(dailyTrackings);
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load daily trackings'));
          this.loadingSignal.set(false);
        },
      });
  }

  private formatError(error: any, fallback: string): string {
    if (error instanceof Error) {
      return error.message.includes('Resource not found')
        ? `${fallback}: Not found`
        : error.message;
    }
    return fallback;
  }
}
