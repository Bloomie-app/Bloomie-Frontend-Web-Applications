import { UserResource } from './user.response';

/**
 * Resource representation of a dermatologist registration payload.
 *
 * @remarks
 * Extends {@link UserResource}. The medical specialty is no longer collected
 * at sign-up — it is set later during the dermatologist profile setup wizard
 * to avoid asking for it twice.
 */
export interface DermatologistResource extends UserResource {
  /** Medical specialty, set during profile setup rather than at registration. */
  specialty?: string;
}
