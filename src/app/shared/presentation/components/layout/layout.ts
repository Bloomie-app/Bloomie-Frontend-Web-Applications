import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { Sidebar } from '../sidebar/sidebar';
import { DermSidebar } from '../derm-sidebar/derm-sidebar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, LanguageSwitcher, Sidebar, DermSidebar],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => (event as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly isAuthenticationRoute = computed(() => this.currentUrl().startsWith('/iam'));

  readonly isDermatologistRoute = computed(() => {
    const url = this.currentUrl();
    return url.startsWith('/derm/') || url === '/derm';
  });

  readonly isOnboardingScanRoute = computed(() => this.currentUrl().includes('/onboarding-scan'));

  readonly isDermSetupRoute = computed(() => this.currentUrl().includes('/derm/setup'));
}
