import {BaseAssembler} from '../../shared/infrastructure/base-assembler';
import {ProductCompatibility} from '../domain/model/product-compatibility.entity';
import {ProductCompatibilityResource, ProductCompatibilitiesResponse} from './product-compatibility.response';

/**
 * Maps ProductCompatibility entities to and from API resources.
 */
export class ProductCompatibilityAssembler implements BaseAssembler<ProductCompatibility, ProductCompatibilityResource, ProductCompatibilitiesResponse> {

  /**
   * Converts a ProductCompatibilitiesResponse to an array of ProductCompatibility entities.
   * @param response - The API response containing product compatibility records.
   * @returns An array of ProductCompatibility entities.
   */
  toEntitiesFromResponse(response: ProductCompatibilitiesResponse): ProductCompatibility[] {
    return response.product_compatibilities.map(resource => this.toEntityFromResource(resource));
  }

  /**
   * Converts a ProductCompatibilityResource to a ProductCompatibility entity.
   * @param resource - The resource to convert.
   * @returns The converted ProductCompatibility entity.
   */
  toEntityFromResource(resource: ProductCompatibilityResource): ProductCompatibility {
    return new ProductCompatibility({
      id:                 resource.id,
      productId:          resource.productId,
      skinType:           resource.skinType,
      compatibilityScore: resource.compatibilityScore,
      reason:             resource.reason,
    });
  }

  /**
   * Converts a ProductCompatibility entity to a ProductCompatibilityResource.
   * @param entity - The entity to convert.
   * @returns The converted ProductCompatibilityResource.
   */
  toResourceFromEntity(entity: ProductCompatibility): ProductCompatibilityResource {
    return {
      id:                 entity.id,
      productId:          entity.productId,
      skinType:           entity.skinType,
      compatibilityScore: entity.compatibilityScore,
      reason:             entity.reason,
    } as ProductCompatibilityResource;
  }
}
