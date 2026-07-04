import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { IamStore } from '../../../application/iam.store';
import { PhotoUpload } from '../../../../shared/presentation/components/photo-upload/photo-upload';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [MatIconModule, TranslatePipe, FormsModule, PhotoUpload],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class UserProfile {
  private readonly router = inject(Router);
  protected readonly iamStore = inject(IamStore);

  protected name = signal<string>('');
  protected email = signal<string>('');
  protected saveSuccess = signal<boolean>(false);

  protected currentPassword = signal<string>('');
  protected newPassword = signal<string>('');
  protected confirmPassword = signal<string>('');
  protected passwordSaveSuccess = signal<boolean>(false);
  protected passwordError = signal<string | null>(null);

  protected readonly currentPhotoUrl = computed(() => this.iamStore.currentUser()?.photoUrl);

  constructor() {
    const user = this.iamStore.currentUser();
    if (user) {
      this.name.set(user.name);
      this.email.set(user.email);
    }
  }

  onSaveChanges(): void {
    const user = this.iamStore.currentUser();
    if (!user) return;

    const emailChanged = this.email() !== user.email;

    this.iamStore.updateUserProfile(user.id, this.name(), user.lastName, this.email())
      .subscribe({
        next: () => {
          this.saveSuccess.set(true);
          setTimeout(() => {
            this.saveSuccess.set(false);
            if (emailChanged) {
              this.iamStore.logout();
            }
          }, 2000);
        },
        error: () => {
          this.saveSuccess.set(true);
          setTimeout(() => this.saveSuccess.set(false), 2000);
        }
      });
  }

  onChangePassword(): void {
    this.passwordError.set(null);

    if (!this.currentPassword() || !this.newPassword() || !this.confirmPassword()) {
      this.passwordError.set('iam.profile.passwordRequired');
      return;
    }
    if (this.newPassword().length < 8) {
      this.passwordError.set('iam.profile.passwordTooShort');
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordError.set('iam.profile.passwordMismatch');
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
        this.passwordError.set('iam.profile.passwordIncorrect');
      },
    });
  }

  onNavigateToSkinProfile(): void {
    this.router.navigate(['/profile/skin-profile']).then();
  }

  onNavigateToSettings(): void {
    this.router.navigate(['/profile/settings']).then();
  }

  onNavigateToMyPlan(): void {
    this.router.navigate(['/profile/my-plan']).then();
  }

  onLogout(): void {
    this.iamStore.logout();
  }

  onBack(): void {
    this.router.navigate(['/dashboard']).then();
  }
}
