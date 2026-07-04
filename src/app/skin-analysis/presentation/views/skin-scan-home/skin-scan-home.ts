import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { SkinAnalysisStore } from '../../../application/skin-analysis.store';

@Component({
  selector: 'app-skin-scan-home',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './skin-scan-home.html',
  styleUrl: './skin-scan-home.css',
})
export class SkinScanHome {
  readonly store = inject(SkinAnalysisStore);
  protected router = inject(Router);

  readonly MAX_WEEKLY_SCANS = 2;

  /** Number of completed scans in the current Mon–Sun week. */
  readonly scansThisWeek = computed((): number => {
    const today = new Date();
    const dow   = today.getDay();
    const mon   = new Date(today);
    mon.setDate(today.getDate() - ((dow + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    const nextMon = new Date(mon);
    nextMon.setDate(mon.getDate() + 7);

    return this.store.facialScans().filter(s => {
      if (!s.isCompleted) return false;
      const d = new Date(s.scannedAt);
      return d >= mon && d < nextMon;
    }).length;
  });

  /** True when the user still has scans available this week. */
  readonly canScan = computed(() => this.scansThisWeek() < this.MAX_WEEKLY_SCANS);

  /** Days remaining until next Monday (when the weekly quota resets). */
  readonly daysUntilNextScan = computed((): number => {
    const dow = new Date().getDay();
    return (8 - dow) % 7 || 7;
  });

  /** True when there is at least one completed scan to show progress stats. */
  readonly hasProgressData = computed(() => this.store.completedScanCount() > 0);

  navigateToScan(): void {
    if (!this.canScan()) return;
    this.router.navigate(['/skin-analysis/prepare']);
  }

  navigateToPastAnalyses(): void {
    this.router.navigate(['/skin-analysis/past-analyses']);
  }

  navigateBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
