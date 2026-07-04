import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../../../shared/presentation/components/language-switcher/language-switcher';

@Component({
  selector: 'app-sign-in-home',
  standalone: true,
  imports: [TranslatePipe, LanguageSwitcher],
  templateUrl: './sign-in-home.html',
  styleUrl: './sign-in-home.css',
})
export class SignInHome {
  private readonly router = inject(Router);

  onLogin = (): void => {
    this.router.navigate(['/iam/sign-in']).then();
  };

  onSignUp = (): void => {
    this.router.navigate(['/iam/sign-up']).then();
  };

  onDermatologistLogin = (): void => {
    this.router.navigate(['/iam/dermatologist-sign-in']).then();
  };

  onDermatologistRegister = (): void => {
    this.router.navigate(['/iam/dermatologist-sign-up']).then();
  };
}
