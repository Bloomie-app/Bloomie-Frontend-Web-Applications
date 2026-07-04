import { BaseResponse } from '../../shared/infrastructure/base-response';
import { UserResource } from './user.response';

/**
 * Response envelope returned by authentication operations
 * such as login and registration.
 *
 * @remarks
 * Contains the access token issued by the server and the authenticated
 * user resource. The token must be stored by the application layer and
 * attached to subsequent protected requests through the IAM interceptor.
 */
export interface AuthResponse extends BaseResponse {
  id:    number;
  email: string;
  token: string;
}
