import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IamStore } from '../../../application/iam.store';
import { MatIcon } from '@angular/material/icon';
import { LanguageSwitcher } from '../../../../shared/presentation/components/language-switcher/language-switcher';

/**
 * Sign-in view for young adult patients.
 *
 * @remarks
 * Collects email and password through a reactive form, validates them
 * locally against the platform policy (non-empty email with valid format,
 * password with at least eight characters) and delegates authentication
 * to {@link IamStore}. The store handles the navigation to the patient
 * area on success and exposes any backend error through its `error`
 * signal, which is rendered as a banner above the action button.
 */
@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MatIcon, LanguageSwitcher],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly iamStore = inject(IamStore);

  /**
   * Toggle that switches the password input between masked and plain text.
   */
  protected readonly showPassword = signal<boolean>(false);

  /**
   * Tracks whether the user has attempted to submit the form at least once,
   * so validation messages are hidden on first render.
   */
  protected readonly submitted = signal<boolean>(false);

  /**
   * Reactive form for the sign-in credentials.
   */
  protected readonly form = this.formBuilder.group({
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  /**
   * Toggles the password visibility flag.
   */
  togglePasswordVisibility = (): void => {
    this.showPassword.update((value) => !value);
  };

  /**
   * Submits the credentials to the IAM store when the form is valid.
   */
  onSubmit = (): void => {
    this.submitted.set(true);
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    this.iamStore.login(email, password);
  };

  /**
   * Navigates back to the authentication hub.
   */
  onBack = (): void => {
    this.router.navigate(['/iam/sign-in-home']).then();
  };

  /**
   * Navigates to the young adult registration view.
   */
  onCreateAccount = (): void => {
    this.router.navigate(['/iam/sign-up']).then();
  };
}
