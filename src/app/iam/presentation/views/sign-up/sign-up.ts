import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IamStore } from '../../../application/iam.store';
import { MatIcon } from '@angular/material/icon';
import { LanguageSwitcher } from '../../../../shared/presentation/components/language-switcher/language-switcher';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, MatIcon, LanguageSwitcher],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUp {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly iamStore = inject(IamStore);

  protected readonly showPassword = signal<boolean>(false);
  protected readonly submitted = signal<boolean>(false);

  protected readonly form = this.formBuilder.group({
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    lastName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    rememberMe: new FormControl<boolean>(false, { nonNullable: true }),
  });

  togglePasswordVisibility = (): void => {
    this.showPassword.update((value) => !value);
  };

  onSubmit = (): void => {
    this.submitted.set(true);
    if (this.form.invalid) return;
    const { email, password, name, lastName } = this.form.getRawValue();
    this.iamStore.registerYoungAdult(email, password, name, lastName);
  };

  onBack = (): void => {
    this.router.navigate(['/iam/sign-in-home']).then();
  };
}