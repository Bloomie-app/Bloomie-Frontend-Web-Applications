import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, retry, tap } from 'rxjs';
import { Router } from '@angular/router';
import { User, UserRole } from '../domain/model/user.entity';
import { IamApi } from '../infrastructure/iam-api';
import { UserAssembler } from '../infrastructure/user.assembler';
import { UserResource } from '../infrastructure/user.response';
import { DermatologistResource } from '../infrastructure/dermatologist.response';

// Temporary: stores the authenticated user in sessionStorage until JWT is implemented.
// sessionStorage is scoped per browser tab, so different accounts can stay signed in
// side by side in separate tabs without one login overwriting the other.
const CURRENT_USER_STORAGE_KEY = 'currentUser';

/**
 * Holds IAM application state and coordinates authentication
 * and registration behavior across the bounded context.
 */
@Injectable({ providedIn: 'root' })
export class IamStore {
  private readonly userAssembler = new UserAssembler();
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  private readonly currentUserSignal = signal<User | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private onboardingPending = false;

  /**
   * Readonly signal for the currently authenticated user, or null when
   * no session is active.
   */
  readonly currentUser = this.currentUserSignal.asReadonly();

  /**
   * Readonly signal indicating whether an authentication operation is
   * currently in progress.
   */
  readonly loading = this.loadingSignal.asReadonly();

  /**
   * Readonly signal for the current authentication error message, or null
   * when the last operation succeeded.
   */
  readonly error = this.errorSignal.asReadonly();

  /**
   * A highly reactive,
   * computed signal that dynamically evaluates the presence of a valid user session,
   * resolving to a boolean true once the authentication handshake is confirmed and an active lifecycle is established within the application context.
   */
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  /**
   * Creates an instance of IamStore and restores any previously persisted session.
   * @param iamApi - The API service for IAM authentication operations.
   */
  constructor(private iamApi: IamApi) {
    this.restorePersistedSession();
  }
  login(email: string, password: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.iamApi
      .login(email, password)
      .pipe(retry(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (authResponse) => {
          console.log('Auth response:', authResponse);
          sessionStorage.setItem('authToken', authResponse.token);
          console.log('Token saved, id:', authResponse.id);

          this.iamApi.getUserById(authResponse.id).subscribe({
            next: (user) => {
              console.log('User obtained:', user);
              const resource: UserResource = {
                id: authResponse.id,
                email: authResponse.email,
                name: user.name,
                lastName: user.lastName,
                role: user.role,
                photoUrl: user.photoUrl ?? null,
              } as any;
              this.handleAuthenticationSuccess(resource);
            },
            error: (err) => {
              console.log('Error getUserById:', err);
              const resource: UserResource = {
                id: authResponse.id,
                email: authResponse.email,
                name: authResponse.email.split('@')[0],
                lastName: '',
                role: 'ROLE_YOUNG_ADULT',
                photoUrl: null,
              } as any;
              this.handleAuthenticationSuccess(resource);
            },
          });
        },
        error: (err) => {
          console.log('Error login:', err);
          this.handleAuthenticationError(err, 'Invalid email or password');
        },
      });
  }
  updateUserPhoto(photoUrl: string): Observable<void> {
    const user = this.currentUserSignal();
    if (!user) return EMPTY;

    const applyLocally = (): void => {
      const updated = new User({
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        role: user.role,
        photoUrl,
      });
      this.currentUserSignal.set(updated);
      const stored = sessionStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as UserResource;
          parsed.photoUrl = photoUrl;
          sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          /* ignore */
        }
      }
    };

    return this.iamApi.updateUserPhoto(user.id, photoUrl).pipe(retry(1), tap(applyLocally));
  }

  /**
   * Retrieves any user by identifier from the backend.
   *
   * @param userId - Identifier of the user to retrieve.
   * @returns Observable emitting the User entity.
   */
  getUserById(userId: number): Observable<User> {
    return this.iamApi.getUserById(userId);
  }

  /**
   * Clears the active session and navigates the user back to the landing page.
   */
  logout(): void {
    this.currentUserSignal.set(null);
    this.errorSignal.set(null);
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    this.router.navigate(['/iam/sign-in-home']).then();
  }

  registerYoungAdult(email: string, password: string, name: string, lastName: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.onboardingPending = true;

    const requestBody = {
      firstName: name,
      lastName:  lastName,
      email:     email,
      password:  password,
    };

    this.iamApi
      .registerYoungAdult(requestBody as any)
      .pipe(retry(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.iamApi.login(email, password)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (authResponse) => {
                sessionStorage.setItem('authToken', authResponse.token);
                this.handleAuthenticationSuccess(user);
              },
              error: () => {
                this.handleAuthenticationSuccess(user);
              }
            });
        },
        error: (err) =>
          this.handleAuthenticationError(err, 'Failed to register young adult account'),
      });
  }

  registerDermatologist(
    email: string,
    password: string,
    name: string,
    lastName: string,
  ): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const requestBody = {
      firstName: name,
      lastName: lastName,
      email: email,
      password: password,
    };

    this.iamApi
      .registerDermatologist(requestBody as any)
      .pipe(retry(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.iamApi.login(email, password)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (authResponse) => {
                sessionStorage.setItem('authToken', authResponse.token);
                this.handleAuthenticationSuccess(user);
              },
              error: () => {
                this.handleAuthenticationSuccess(user);
              }
            });
        },
        error: (err) =>
          this.handleAuthenticationError(err, 'Failed to register dermatologist account'),
      });
  }

  private handleAuthenticationSuccess(resource: UserResource): void {
    const user = this.userAssembler.toEntityFromResource(resource);
    this.currentUserSignal.set(user);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);

    sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(resource));

    this.navigateToRoleEntryPoint(user.role);
  }

  /**
   * Records an authentication failure on the store state.
   *
   * @param error - Source error raised by the API or mock layer.
   * @param fallback - Default message used when the error has no readable detail.
   */
  private handleAuthenticationError(error: unknown, fallback: string): void {
    const message = error instanceof Error && error.message ? error.message : fallback;
    this.errorSignal.set(message);
    this.loadingSignal.set(false);
  }

  private restorePersistedSession(): void {
    const stored = sessionStorage.getItem(CURRENT_USER_STORAGE_KEY);
    if (!stored) return;

    try {
      const resource = JSON.parse(stored) as UserResource;
      const user = this.userAssembler.toEntityFromResource(resource);
      this.currentUserSignal.set(user);
    } catch {
      sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  }

  /**
   * Navigates the authenticated user to the entry route that matches their role.
   *
   * @param role - Role granted to the authenticated user.
   */
  private navigateToRoleEntryPoint(role: UserRole): void {
    if (role === UserRole.Dermatologist) {
      this.router.navigate(['/derm']).then();
      return;
    }
    if (this.onboardingPending) {
      this.onboardingPending = false;
      this.router.navigate(['/iam/lifestyle-form']).then();
      return;
    }
    this.router.navigate(['/dashboard']).then();
  }

  updateUserProfile(userId: number, firstName: string, lastName: string, email: string): Observable<User> {
    return this.iamApi.updateUserProfile(userId, firstName, lastName, email).pipe(
      tap(updatedUser => {
        const resource: UserResource = {
          id:        updatedUser.id,
          email:     updatedUser.email,
          firstName: updatedUser.name,
          lastName:  updatedUser.lastName,
          role:      updatedUser.role,
          photoUrl:  updatedUser.photoUrl,
        } as any;
        sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(resource));
        this.currentUserSignal.set(updatedUser);
      })
    );
  }

  /**
   * Changes the password of the currently authenticated user.
   *
   * @param currentPassword - Current plain-text password, verified by the backend.
   * @param newPassword - New plain-text password to set.
   * @returns Observable that completes when the password has been changed.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const user = this.currentUserSignal();
    if (!user) return EMPTY;

    return this.iamApi.changePassword(user.id, currentPassword, newPassword);
  }
}
