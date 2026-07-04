import { BaseResource } from '../../shared/infrastructure/base-response';

/**
 * Resource representation of a user account returned by the IAM API.
 */
export interface UserResource extends BaseResource {
  id:         number;
  fullName?:  string;
  firstName?: string;
  lastName?:  string;
  email:      string;
  roles?:     string[];
  role?:      string;
  photoUrl?:  string | null;
  name?:      string;
}
