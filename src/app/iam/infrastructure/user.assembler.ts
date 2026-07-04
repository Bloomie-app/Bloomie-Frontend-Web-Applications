import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { User, UserRole } from '../domain/model/user.entity';
import { UserResource }   from './user.response';
import { AuthResponse }   from './auth.response';

/**
 * Maps User entities to and from API resources within the IAM bounded context.
 */
export class UserAssembler implements BaseAssembler<User, UserResource, AuthResponse> {
  toEntitiesFromResponse(response: AuthResponse): User[] {
    return [];
  }

  toEntityFromResource(resource: UserResource): User {
    let name = '';
    let lastName = '';

    if (resource.firstName || resource.lastName) {
      name = resource.firstName ?? '';
      lastName = resource.lastName ?? '';
    } else if (resource.fullName) {
      const spaceIdx = resource.fullName.indexOf(' ');
      name = spaceIdx >= 0 ? resource.fullName.substring(0, spaceIdx) : resource.fullName;
      lastName = spaceIdx >= 0 ? resource.fullName.substring(spaceIdx + 1) : '';
    }

    // Maneja tanto roles[] (mock) como role string (backend real)
    const rawRole = resource.roles?.[0] ?? resource.role ?? '';
    const role = rawRole.replace('ROLE_', '') as UserRole;

    return new User({
      id: resource.id,
      email: resource.email,
      name,
      lastName,
      role,
      photoUrl: resource.photoUrl ?? undefined,
    });
  }

  toResourceFromEntity(entity: User): UserResource {
    return {
      id: entity.id,
      fullName: `${entity.name} ${entity.lastName}`.trim(),
      email: entity.email,
      roles: [entity.role],
      photoUrl: entity.photoUrl,
    };
  }
}
