import {Component, computed, effect, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {TranslatePipe} from '@ngx-translate/core';
import {FormsModule} from '@angular/forms';
import {SlicePipe} from '@angular/common';
import {IamStore} from '../../../../iam/application/iam.store';
import {DermatologyCareStore} from '../../../application/dermatology-care.store';
import {PhotoUpload} from '../../../../shared/presentation/components/photo-upload/photo-upload';
import {
  formatLicenseNumber,
  LICENSE_NUMBER_MAX_LENGTH,
  LICENSE_NUMBER_PLACEHOLDER,
} from '../../../../shared/presentation/utils/license-number.util';

@Component({
  selector: 'app-derm-profile',
  standalone: true,
  imports: [MatIconModule, TranslatePipe, FormsModule, PhotoUpload, SlicePipe],
  templateUrl: './derm-profile.html',
  styleUrl: './derm-profile.css',
})
export class DermProfile {
  private readonly router = inject(Router);
  protected readonly iamStore = inject(IamStore);
  protected readonly dermatologyCareStore = inject(DermatologyCareStore);

  readonly specialties = [
    'Dermatology',
    'Pediatric Dermatology',
    'Cosmetic Dermatology',
    'Dermatopathology',
    'Mohs Surgery',
    'Teledermatology',
  ] as const;

  protected name = signal<string>('');
  protected email = signal<string>('');
  protected licenseNumber = signal<string>('');
  protected contactPhone = signal<string>('');
  protected specialty = signal<string>('');
  protected biography = signal<string>('');
  protected fee = signal<string>('');

  protected savePersonalSuccess = signal<boolean>(false);
  protected saveProfessionalSuccess = signal<boolean>(false);

  protected currentPassword = signal<string>('');
  protected newPassword = signal<string>('');
  protected confirmPassword = signal<string>('');
  protected passwordSaveSuccess = signal<boolean>(false);
  protected passwordError = signal<string | null>(null);

  protected readonly licenseNumberPlaceholder = LICENSE_NUMBER_PLACEHOLDER;
  protected readonly licenseNumberMaxLength   = LICENSE_NUMBER_MAX_LENGTH;

  protected readonly currentPhotoUrl = computed(() => this.iamStore.currentUser()?.photoUrl);

  constructor() {
    const user = this.iamStore.currentUser();
    if (user) {
      // Fallback default until the dermatologist profile (source of truth for fullName) loads.
      this.name.set(user.name);
      this.email.set(user.email);
    }
    effect(() => {
      const profiles = this.dermatologyCareStore.dermatologistProfiles();
      const u = this.iamStore.currentUser();
      if (!u) return;
      const profile = profiles.find((p) => Number(p.userId) === Number(u.id));
      if (profile) {
        // Re-runs after every save too (the store replaces the profile in its signal
        // with the backend response), so these fields always reflect what's actually saved.
        this.name.set(profile.fullName || u.name);
        this.specialty.set(profile.specialty);
        this.fee.set(profile.consultationFee.toString());
        this.licenseNumber.set(profile.licenseNumber);
        this.contactPhone.set(profile.contactPhone);
        this.biography.set(profile.biography);
      }
    });
  }

  onLicenseNumberChange(rawValue: string): void {
    this.licenseNumber.set(formatLicenseNumber(rawValue));
  }

  onSavePersonal(): void {
    const user = this.iamStore.currentUser();
    if (!user) return;
    const profile = this.dermatologyCareStore
      .dermatologistProfiles()
      .find((p) => Number(p.userId) === Number(user.id));
    if (!profile) return;

    profile.fullName = this.name();
    profile.licenseNumber = this.licenseNumber();
    profile.contactPhone = this.contactPhone();
    this.dermatologyCareStore.updateDermatologistProfile(profile);

    // The name/email shown here are the dermatologist's IAM account identity
    // (sidebar greeting, login), not part of the dermatology-care profile —
    // that PUT alone never touches the `users` table, so update it too.
    const emailChanged = this.email() !== user.email;
    const [firstName, ...rest] = this.name().trim().split(/\s+/);
    const lastName = rest.join(' ');
    this.iamStore.updateUserProfile(user.id, firstName || user.name, lastName, this.email())
      .subscribe({
        next: () => {
          if (emailChanged) this.iamStore.logout();
        },
        error: () => {},
      });

    this.savePersonalSuccess.set(true);
    setTimeout(() => this.savePersonalSuccess.set(false), 2000);
  }

  onSaveProfessional(): void {
    const user = this.iamStore.currentUser();
    if (!user) return;
    const profile = this.dermatologyCareStore
      .dermatologistProfiles()
      .find((p) => Number(p.userId) === Number(user.id));
    if (!profile) return;

    if (!this.specialty() || !this.fee()) {
      alert('Specialty and fee are required');
      return;
    }

    profile.specialty = this.specialty();
    profile.consultationFee = parseFloat(this.fee()) || 0;
    profile.biography = this.biography();
    this.dermatologyCareStore.updateDermatologistProfile(profile);
    this.saveProfessionalSuccess.set(true);
    setTimeout(() => this.saveProfessionalSuccess.set(false), 2000);
  }

  onChangePassword(): void {
    this.passwordError.set(null);

    if (!this.currentPassword() || !this.newPassword() || !this.confirmPassword()) {
      this.passwordError.set('iam.dermProfile.passwordRequired');
      return;
    }
    if (this.newPassword().length < 8) {
      this.passwordError.set('iam.dermProfile.passwordTooShort');
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordError.set('iam.dermProfile.passwordMismatch');
      return;
    }

    this.iamStore.changePassword(this.currentPassword(), this.newPassword()).subscribe({
      next: () => {
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.passwordSaveSuccess.set(true);
        setTimeout(() => this.passwordSaveSuccess.set(false), 2000);
      },
      error: () => {
        this.passwordError.set('iam.dermProfile.passwordIncorrect');
      },
    });
  }

  onNavigateToAvailability(): void {
    this.router.navigate(['/derm/availability']).then();
  }

  onLogout(): void {
    this.iamStore.logout();
  }

  onBack(): void {
    this.router.navigate(['/derm/agenda']).then();
  }
}
