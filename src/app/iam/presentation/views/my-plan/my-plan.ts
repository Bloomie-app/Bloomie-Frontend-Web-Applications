import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IamStore } from '../../../application/iam.store';
import { SubscriptionStore } from '../../../../subscription/application/subscription.store';
import { environment } from '../../../../../environments/environment';

interface BackendPlan {
  id: number;
  type: string;
  name: string;
  price: number;
  durationDays: number;
  modules: string[];
}

interface Plan {
  id: number;
  name: string;
  taglineKey: string;
  price: number;
  icon: string;
  color: string;
  textColor: string;
  featureKeys: string[];
}

/** Decorative UI metadata per plan type — the backend only knows price/name/modules. */
const PLAN_UI_META: Record<string, Pick<Plan, 'taglineKey' | 'icon' | 'color' | 'textColor' | 'featureKeys'>> = {
  STARTER: {
    taglineKey: 'iam.myPlan.plans.starter.tagline',
    icon: 'star',
    color: '#cebebe',
    textColor: '#a26769',
    featureKeys: [
      'iam.myPlan.plans.starter.f1',
      'iam.myPlan.plans.starter.f2',
      'iam.myPlan.plans.starter.f3',
      'iam.myPlan.plans.starter.f4',
      'iam.myPlan.plans.starter.f5',
    ],
  },
  ADVANCED: {
    taglineKey: 'iam.myPlan.plans.advanced.tagline',
    icon: 'bolt',
    color: '#a26769',
    textColor: '#ffffff',
    featureKeys: [
      'iam.myPlan.plans.advanced.f1',
      'iam.myPlan.plans.advanced.f2',
      'iam.myPlan.plans.advanced.f3',
      'iam.myPlan.plans.advanced.f4',
      'iam.myPlan.plans.advanced.f5',
    ],
  },
  ELITE: {
    taglineKey: 'iam.myPlan.plans.elite.tagline',
    icon: 'workspace_premium',
    color: '#333333',
    textColor: '#ffffff',
    featureKeys: [
      'iam.myPlan.plans.elite.f1',
      'iam.myPlan.plans.elite.f2',
      'iam.myPlan.plans.elite.f3',
      'iam.myPlan.plans.elite.f4',
      'iam.myPlan.plans.elite.f5',
    ],
  },
};

@Component({
  selector: 'app-my-plan',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './my-plan.html',
  styleUrl: './my-plan.css',
})
export class MyPlan implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly http = inject(HttpClient);
  private readonly iamStore = inject(IamStore);
  private readonly translateService = inject(TranslateService);
  protected readonly subscriptionStore = inject(SubscriptionStore);

  protected showCancelModal = signal<boolean>(false);
  protected showChangePlan = signal<boolean>(false);
  protected selectedNewPlan = signal<number | null>(null);
  protected cancelConfirmed = signal<boolean>(false);
  protected cancelling = signal<boolean>(false);
  protected cancelError = signal<string | null>(null);
  protected expandedPlanId = signal<number | null>(null);

  protected changingPlan = signal<boolean>(false);
  protected planChanged = signal<boolean>(false);
  protected planChangeError = signal<string | null>(null);

  constructor() {
    const user = this.iamStore.currentUser();
    if (user) {
      this.subscriptionStore.loadForPatient(user.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  ngOnInit(): void {
    this.http
      .get<BackendPlan[]>(`${environment.backendBasePath}${environment.backendPlansEndpointPath}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (backendPlans) => {
          this.plans.set(
            backendPlans.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              ...(PLAN_UI_META[p.type] ?? PLAN_UI_META['STARTER']),
            })),
          );
        },
        error: () => {},
      });
  }

  private readonly fallbackPlan: Plan = {
    id: 0,
    name: '',
    taglineKey: '',
    price: 0,
    icon: 'bolt',
    color: '#a26769',
    textColor: '#ffffff',
    featureKeys: [],
  };

  readonly plans = signal<Plan[]>([]);

  get currentPlanId(): number | null {
    return this.subscriptionStore.currentSubscription()?.planId ?? null;
  }

  readonly cardLast4 = '4242';
  readonly cardExpiry = '08/2028';
  private readonly fallbackBillingDate = 'June 1, 2026';

  readonly billingDate = computed((): string => {
    const endDate = this.subscriptionStore.currentSubscription()?.endDate;
    if (!endDate) return this.fallbackBillingDate;
    const locale = this.translateService.currentLang === 'es' ? 'es-ES' : 'en-US';
    return new Date(endDate).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  });

  readonly currentUserFullName = computed((): string => {
    const user = this.iamStore.currentUser();
    return user ? `${user.name} ${user.lastName}` : '';
  });

  get currentPlan(): Plan {
    return this.plans().find((p) => p.id === this.currentPlanId) ?? this.fallbackPlan;
  }

  get otherPlans(): Plan[] {
    return this.plans().filter((p) => p.id !== this.currentPlanId);
  }

  get selectedPlanForModal(): Plan | null {
    const id = this.selectedNewPlan();
    return id === null ? null : (this.plans().find((p) => p.id === id) ?? null);
  }

  isUpgrade(plan: Plan): boolean {
    return plan.price > this.currentPlan.price;
  }

  togglePlanExpand(planId: number): void {
    this.expandedPlanId.set(this.expandedPlanId() === planId ? null : planId);
  }

  onSelectPlan(planId: number): void {
    this.selectedNewPlan.set(planId);
    this.showChangePlan.set(true);
    this.planChanged.set(false);
    this.planChangeError.set(null);
  }

  onCloseChangePlanModal(): void {
    this.showChangePlan.set(false);
    this.selectedNewPlan.set(null);
    this.planChanged.set(false);
    this.planChangeError.set(null);
  }

  onConfirmChangePlan(): void {
    const planId = this.selectedNewPlan();
    if (planId === null) return;

    this.changingPlan.set(true);
    this.planChangeError.set(null);
    this.subscriptionStore
      .changePlan(planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.changingPlan.set(false);
          this.planChanged.set(true);
          this.expandedPlanId.set(null);
        },
        error: () => {
          this.changingPlan.set(false);
          this.planChangeError.set('iam.myPlan.switchPlanError');
        },
      });
  }

  onOpenCancelModal(): void {
    this.showCancelModal.set(true);
    this.cancelConfirmed.set(false);
    this.cancelError.set(null);
  }

  onCloseCancelModal(): void {
    this.showCancelModal.set(false);
    this.cancelConfirmed.set(false);
    this.cancelError.set(null);
  }

  onConfirmCancel(): void {
    this.cancelling.set(true);
    this.cancelError.set(null);
    this.subscriptionStore
      .cancel()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelling.set(false);
          this.cancelConfirmed.set(true);
        },
        error: () => {
          this.cancelling.set(false);
          this.cancelError.set('iam.myPlan.cancelError');
        },
      });
  }

  onBack(): void {
    this.router.navigate(['/profile']).then();
  }
}
