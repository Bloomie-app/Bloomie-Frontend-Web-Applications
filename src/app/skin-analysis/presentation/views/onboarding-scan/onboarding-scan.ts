import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { IamStore } from '../../../../iam/application/iam.store';

@Component({
  selector: 'app-onboarding-scan',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './onboarding-scan.html',
  styleUrl: './onboarding-scan.css',
})
export class OnboardingScan {
  private readonly router = inject(Router);
  private readonly iamStore = inject(IamStore);

  readonly userName = this.iamStore.currentUser()?.name ?? '';

  startScan(): void {
    this.router.navigate(['/skin-analysis/prepare']);
  }

  skipForNow(): void {
    this.router.navigate(['/dashboard']);
  }
}
