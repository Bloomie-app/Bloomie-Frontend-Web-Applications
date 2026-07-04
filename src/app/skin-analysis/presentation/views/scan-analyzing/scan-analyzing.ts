import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-scan-analyzing',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './scan-analyzing.html',
  styleUrl: './scan-analyzing.css',
})
export class ScanAnalyzing implements OnInit {
  protected router = inject(Router);

  readonly progress = signal<number>(0);

  readonly steps = [
    'Detecting skin zones…',
    'Analyzing hydration levels…',
    'Measuring texture & tone…',
    'Calculating your score…',
  ];

  readonly currentStep = computed((): string => {
    const p = this.progress();
    if (p < 25) return this.steps[0];
    if (p < 50) return this.steps[1];
    if (p < 75) return this.steps[2];
    return this.steps[3];
  });

  ngOnInit(): void {
    const intervalId = setInterval(() => {
      const current = this.progress();
      if (current >= 100) {
        clearInterval(intervalId);
        this.router.navigate(['/skin-analysis/result']);
        return;
      }
      this.progress.set(current + 2);
    }, 80);
  }

  navigateBack(): void {
    this.router.navigate(['/skin-analysis']);
  }
}
