import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { SkinAnalysisStore } from '../../../application/skin-analysis.store';
import { FacialScan } from '../../../domain/model/facial-scan.entity';
import { SkinAnalysis } from '../../../domain/model/skin-analysis.entity';

export interface ScanItem {
  scan: FacialScan;
  analysis: SkinAnalysis | null;
  isLatest: boolean;
}

@Component({
  selector: 'app-past-analyses',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './past-analyses.html',
  styleUrl: './past-analyses.css',
})
export class PastAnalyses {
  readonly store = inject(SkinAnalysisStore);
  protected router = inject(Router);

  readonly scanItems = computed((): ScanItem[] => {
    const analyses = this.store.skinAnalyses();
    const sorted = this.store.facialScans()
      .filter(s => s.isCompleted)
      .map(scan => ({
        scan,
        analysis: analyses.find(a => a.facialScanId === scan.id) ?? null,
        isLatest: false,
      }))
      .sort((a, b) => new Date(b.scan.scannedAt).getTime() - new Date(a.scan.scannedAt).getTime());
    if (sorted.length > 0) sorted[0].isLatest = true;
    return sorted;
  });

  scoreColor(score: number): string {
    if (score >= 75) return '#4caf50';
    if (score >= 50) return '#a26769';
    return '#ef5350';
  }

  onViewAnalysis(scan: FacialScan): void {
    this.store.selectCurrentScan(scan);
    this.router.navigate(['/skin-analysis/result']);
  }

  navigateBack(): void {
    this.router.navigate(['/skin-analysis']);
  }
}
