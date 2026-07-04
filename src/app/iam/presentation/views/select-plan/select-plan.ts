import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { IamStore } from '../../../application/iam.store';
import { environment } from '../../../../../environments/environment';

interface Plan {
  id: number;
  name: string;
  type: string;
  price: number;
  durationDays: number;
  modules: string[];
}

@Component({
  selector: 'app-select-plan',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './select-plan.html',
  styleUrl: './select-plan.css',
})
export class SelectPlan implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly iamStore = inject(IamStore);

  readonly plans = signal<Plan[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  /** True when the user was sent here after losing access (expired/cancelled plan), not during fresh sign-up. */
  readonly isReactivation = signal<boolean>(false);

  ngOnInit(): void {
    this.isReactivation.set(this.route.snapshot.queryParamMap.get('reason') === 'subscription-ended');
    this.loadPlans();
  }

  onLogout(): void {
    this.iamStore.logout();
  }

  private loadPlans(): void {
    this.loading.set(true);
    this.http
      .get<Plan[]>(`${environment.backendBasePath}${environment.backendPlansEndpointPath}`)
      .subscribe({
        next: (plans) => {
          this.plans.set(plans);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load plans');
          this.loading.set(false);
        },
      });
  }

  selectPlan(plan: Plan): void {
    const user = this.iamStore.currentUser();
    if (!user) return;

    this.loading.set(true);

    localStorage.setItem('pendingPlanId', plan.id.toString());
    localStorage.setItem('pendingPlanName', plan.name);
    localStorage.setItem('pendingPlanAmount', plan.price.toString());

    this.http
      .post<{ checkoutUrl: string }>(`${environment.backendBasePath}/payments/checkout`, {
        patientId: user.id,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
      })
      .subscribe({
        next: (response) => {
          // Redirige a Stripe
          window.location.href = response.checkoutUrl;
        },
        error: () => {
          this.error.set('Failed to create checkout session. Please try again.');
          this.loading.set(false);
        },
      });
  }

  getPlanIcon(type: string): string {
    return type === 'PREMIUM' ? 'workspace_premium' : type === 'PRO' ? 'bolt' : 'spa';
  }

  getPlanColor(type: string): string {
    return type === 'PREMIUM' ? '#a26769' : type === 'PRO' ? '#6fa8c8' : '#8fbc8f';
  }
}
