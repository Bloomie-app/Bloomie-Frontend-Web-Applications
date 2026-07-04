import { Injectable }   from '@angular/core';
import { HttpClient }   from '@angular/common/http';
import { Observable }   from 'rxjs';
import { BaseApi }      from '../../shared/infrastructure/base-api';
import { User }         from '../domain/model/user.entity';
import { UserResource } from './user.response';
import { DermatologistResource } from './dermatologist.response';
import { AuthResponse }      from './auth.response';
import { IamApiEndpoint }    from './iam-api-endpoint';

/**
 * Infrastructure facade for IAM authentication operations.
 *
 * @remarks
 * Composes the {@link IamApiEndpoint} and exposes use-case oriented methods
 * to the application layer ({@link IamStore}). Keeping the facade thin allows
 * the store to stay focused on application state without leaking transport
 * details such as endpoint URLs or HTTP verbs.
 */
@Injectable({ providedIn: 'root' })
export class IamApi extends BaseApi {
  private readonly iamEndpoint: IamApiEndpoint;

  /**
   * Creates an instance of IamApi.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(http: HttpClient) {
    super();
    this.iamEndpoint = new IamApiEndpoint(http);
  }

  /**
   * Authenticates a user against the IAM backend.
   * @param email - Email address of the account.
   * @param password - Plain text password provided by the user.
   * @returns Stream emitting the {@link AuthResponse} envelope on success.
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.iamEndpoint.login(email, password);
  }

  /**
   * Registers a new young adult account.
   * @param resource - User resource carrying the registration payload.
   * @returns Stream emitting the created {@link UserResource}.
   */
  registerYoungAdult(resource: UserResource): Observable<UserResource> {
    return this.iamEndpoint.registerYoungAdult(resource);
  }

  /**
   * Registers a new dermatologist account.
   * @param resource - Dermatologist resource carrying the registration payload.
   * @returns Stream emitting the created {@link UserResource}.
   */
  registerDermatologist(resource: DermatologistResource): Observable<UserResource> {
    return this.iamEndpoint.registerDermatologist(resource);
  }

  /**
   * Retrieves all users from the backend.
   * @returns Stream emitting the full list of {@link UserResource}.
   */
  getAllUsers(): Observable<UserResource[]> {
    return this.iamEndpoint.getAllUsers();
  }

  /**
   * Updates the profile photo of a user.
   * @param userId - Identifier of the user.
   * @param photoUrl - Base64-encoded data URL of the new photo.
   * @returns Completion stream for the update operation.
   */
  updateUserPhoto(userId: number, photoUrl: string): Observable<void> {
    return this.iamEndpoint.updateUserPhoto(userId, photoUrl);
  }

  /**
   * Retrieves a user by identifier from the backend.
   * @param userId - Identifier of the user to retrieve.
   * @returns Stream with the matched User entity.
   */
  getUserById(userId: number): Observable<User> {
    return this.iamEndpoint.getUserById(userId);
  }

  updateUserProfile(
    userId: number,
    firstName: string,
    lastName: string,
    email: string,
  ): Observable<User> {
    return this.iamEndpoint.updateUserProfile(userId, firstName, lastName, email);
  }

  /**
   * Changes the password of a user.
   * @param userId - Identifier of the user.
   * @param currentPassword - Current plain-text password.
   * @param newPassword - New plain-text password.
   * @returns Completion stream for the update operation.
   */
  changePassword(userId: number, currentPassword: string, newPassword: string): Observable<void> {
    return this.iamEndpoint.changePassword(userId, currentPassword, newPassword);
  }
}
