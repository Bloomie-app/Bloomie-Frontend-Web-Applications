import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import {
  SkinProfile,
  SkinProfileStatus,
  SkinSensitivity,
  SkinType,
} from '../domain/model/skin-profile.entity';
import { SkinProfileResource, SkinProfilesResponse } from './skin-profile.response';

export class SkinProfileAssembler implements BaseAssembler<
  SkinProfile,
  SkinProfileResource,
  SkinProfilesResponse
> {
  toEntitiesFromResponse(response: SkinProfilesResponse): SkinProfile[] {
    return response.skinProfiles.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: SkinProfileResource): SkinProfile {
    return new SkinProfile({
      id: resource.id,
      userId: resource.patientId,
      skinType: resource.skinType as SkinType,
      sensitivity: resource.sensitivity as SkinSensitivity,
      status: resource.status as SkinProfileStatus,
      waterIntake: resource.waterIntake?.toString() ?? '',
      sunExposure: resource.sunExposure?.toString() ?? '',
      sleepHours: resource.sleepHours?.toString() ?? '',
    });
  }

  toResourceFromEntity(entity: SkinProfile): SkinProfileResource {
    return {
      id: entity.id,
      patientId: entity.userId,
      skinType: entity.skinType,
      sensitivity: entity.sensitivity,
      waterIntake: entity.waterIntake as any,
      sunExposure: entity.sunExposure as any,
      sleepHours: entity.sleepHours as any,
      status: entity.status,
    } as SkinProfileResource;
  }
}
