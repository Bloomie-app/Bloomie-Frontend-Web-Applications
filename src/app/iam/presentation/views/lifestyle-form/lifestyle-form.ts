import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { IamStore } from '../../../application/iam.store';
import { SkinAnalysisApi } from '../../../../skin-analysis/infrastructure/skin-analysis-api';

@Component({
  selector: 'app-lifestyle-form',
  standalone: true,
  imports: [FormsModule, TranslatePipe, MatIcon],
  templateUrl: './lifestyle-form.html',
  styleUrl: './lifestyle-form.css',
})
export class LifestyleForm {
  private readonly router = inject(Router);
  private readonly iamStore = inject(IamStore);
  private readonly skinAnalysisApi = inject(SkinAnalysisApi);

  protected readonly skinType = signal<string>('');
  protected readonly waterIntake = signal<string>('');
  protected readonly sunExposure = signal<string>('');
  protected readonly sleepHabits = signal<string>('');
  protected readonly guideOpen = signal<boolean>(false);
  protected readonly submitting = signal<boolean>(false);

  protected readonly totalSteps = 4;

  /** Number of the 4 questions answered so far — drives the progress bar. */
  protected readonly step = computed((): number => {
    return [this.skinType(), this.waterIntake(), this.sunExposure(), this.sleepHabits()]
      .filter((value) => value !== '').length;
  });

  protected readonly progress = computed((): number => (this.step() / this.totalSteps) * 100);

  readonly skinTypeOptions = ['Normal', 'Dry', 'Oily', 'Combination Skin'];

  readonly waterOptions = ['0-2 glasses', '3-5 glasses', '6-8 glasses', 'More than 8'];

  readonly sunOptions = ['Less than 30 min', '30-60 minutes', '1-2 hours', 'More than 2 hours'];

  readonly sleepOptions = ['Less than 6 hours', '6-7 hours', '8 hours', 'More than 8 hours'];

  private readonly skinTypeMap: Record<string, string> = {
    Normal: 'NORMAL',
    Dry: 'DRY',
    Oily: 'OILY',
    'Combination Skin': 'COMBINATION',
  };

  private deriveSensitivity(): string {
    const highRisk =
      this.sunExposure() === 'More than 2 hours' || this.sleepHabits() === 'Less than 6 hours';
    const mediumRisk = this.sunExposure() === '1-2 hours' || this.sleepHabits() === '6-7 hours';
    if (highRisk) return 'HIGH';
    if (mediumRisk) return 'MEDIUM';
    return 'LOW';
  }

  onNext(): void {
    if (this.submitting()) return;
    this.submitting.set(true);

    const user = this.iamStore.currentUser();
    if (!user) return;

    this.skinAnalysisApi
      .createSkinProfile({
        patientId: user.id,
        skinType: this.skinTypeMap[this.skinType()] ?? 'NORMAL',
        sensitivity: this.deriveSensitivity(),
        waterIntake: this.waterIntake(),
        sunExposure: this.sunExposure(),
        sleepHours: this.sleepHabits(),
      })
      .subscribe({
        next: () => this.router.navigate(['/iam/select-plan']),
        error: () => {
          this.submitting.set(false);
          this.router.navigate(['/iam/select-plan']);
        },
      });
  }

  openGuide(): void {
    this.guideOpen.set(true);
  }
  closeGuide(): void {
    this.guideOpen.set(false);
  }
  onBack(): void {
    this.router.navigate(['/iam/sign-up']).then();
  }
}
