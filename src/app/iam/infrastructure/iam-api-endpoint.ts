import { HttpClient }   from '@angular/common/http';
import { Observable }   from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment }      from '../../../environments/environment';
import { BaseApiEndpoint }  from '../../shared/infrastructure/base-api-endpoint';
import { User }             from '../domain/model/user.entity';
import { UserResource }     from './user.response';
import { DermatologistResource } from './dermatologist.response';
import { AuthResponse }     from './auth.response';
import { UserAssembler }    from './user.assembler';

/**
 * Endpoint client for IAM authentication operations.
 *
 * @remarks
 * Extends {@link BaseApiEndpoint} so that the shared CRUD machinery remains
 * available, while exposing the authentication-specific operations required
 * by the bounded context: login, young adult registration, and dermatologist
 * registration. Each operation delegates resource-to-entity conversion to
 * the {@link UserAssembler}.
 */
export class IamApiEndpoint extends BaseApiEndpoint<User, UserResource, AuthResponse, UserAssembler> {

  /** Endpoint URL for the login operation. */
  private readonly loginEndpointUrl: string;

  /** Endpoint URL for the young adult registration operation. */
  private readonly registerYoungAdultEndpointUrl: string;

  /** Endpoint URL for the dermatologist registration operation. */
  private readonly registerDermatologistEndpointUrl: string;

  /** Base URL for backend user operations (photo update, user lookup). */
  private readonly backendUsersUrl: string;

  /**
   * Creates an instance of IamApiEndpoint.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.serverBasePath}${environment.usersEndpointPath}`,
      new UserAssembler()
    );
    this.loginEndpointUrl                 = `${environment.backendBasePath}${environment.authenticationLoginEndpointPath}`;
    this.registerYoungAdultEndpointUrl    = `${environment.backendBasePath}${environment.backendAuthenticationRegisterEndpointPath}`;
    this.registerDermatologistEndpointUrl = `${environment.backendBasePath}${environment.backendAuthenticationRegisterDermatologistEndpointPath}`;
    this.backendUsersUrl                  = `${environment.backendBasePath}${environment.backendUsersEndpointPath}`;
  }

  /**
   * Authenticates a user against the IAM backend.
   * @param email - Email address of the account.
   * @param password - Plain text password provided by the user.
   * @returns Stream emitting the {@link AuthResponse} envelope on success.
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.loginEndpointUrl, { email, password }).pipe(
      map(response => response),
      catchError(this.handleError('Failed to authenticate user'))
    );
  }

  /**
   * Registers a new young adult account.
   * @param resource - User resource carrying the registration payload.
   * @returns Stream emitting the created {@link UserResource}.
   */
  registerYoungAdult(resource: UserResource): Observable<UserResource> {
    return this.http.post<UserResource>(this.registerYoungAdultEndpointUrl, resource).pipe(
      map(response => response),
      catchError(this.handleError('Failed to register young adult'))
    );
  }

  /**
   * Registers a new dermatologist account.
   * @param resource - Dermatologist resource carrying the registration payload.
   * @returns Stream emitting the created {@link UserResource}.
   */
  registerDermatologist(resource: DermatologistResource): Observable<UserResource> {
    return this.http.post<UserResource>(this.registerDermatologistEndpointUrl, resource).pipe(
      map(response => response),
      catchError(this.handleError('Failed to register dermatologist'))
    );
  }

  /**
   * Retrieves all users from the backend.
   * @returns Stream emitting the full list of {@link UserResource}.
   */
  getAllUsers(): Observable<UserResource[]> {
    return this.http.get<UserResource[]>(this.backendUsersUrl).pipe(
      catchError(this.handleError('Failed to get users'))
    );
  }

  /**
   * Updates the profile photo of a user.
   * @param userId - Identifier of the user whose photo is being updated.
   * @param photoUrl - Base64-encoded data URL of the new photo.
   * @returns Completion stream for the update operation.
   */
  updateUserPhoto(userId: number, photoUrl: string): Observable<void> {
    return this.http.put<void>(`${this.backendUsersUrl}/${userId}/photo`, { photoUrl }).pipe(
      catchError(this.handleError('Failed to update user photo'))
    );
  }

  /**
   * Retrieves a single user by identifier from the backend.
   * @param userId - Identifier of the user to retrieve.
   * @returns Stream with the mapped User entity.
   */
  getUserById(userId: number): Observable<User> {
    return this.http.get<UserResource>(`${this.backendUsersUrl}/${userId}`).pipe(
      map(resource => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to get user'))
    );
  }

  /**
   * Updates the profile of a user (name and email).
   * @param userId    - Identifier of the user to update.
   * @param firstName - New first name.
   * @param lastName  - New last name.
   * @param email     - New email address.
   * @returns Stream with the updated User entity.
   */
  updateUserProfile(userId: number, firstName: string, lastName: string, email: string): Observable<User> {
    return this.http.put<UserResource>(`${this.backendUsersUrl}/${userId}`, { firstName, lastName, email }).pipe(
      map(resource => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to update user profile'))
    );
  }

  /**
   * Changes the password of a user, verifying the current password first.
   * @param userId - Identifier of the user whose password is being changed.
   * @param currentPassword - Current plain-text password, verified by the backend.
   * @param newPassword - New plain-text password to set.
   * @returns Completion stream for the update operation.
   */
  changePassword(userId: number, currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.backendUsersUrl}/${userId}/password`, { currentPassword, newPassword }).pipe(
      catchError(this.handleError('Failed to change password'))
    );
  }
}
