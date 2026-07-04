import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Product, ProductCategory } from '../domain/model/product.entity';
import { ProductResource, ProductsResponse } from './product.response';

export class ProductAssembler implements BaseAssembler<Product, ProductResource, ProductsResponse> {
  toEntitiesFromResponse(response: ProductsResponse): Product[] {
    return response.products.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: ProductResource): Product {
    return new Product({
      id: resource.id,
      name: resource.name,
      brand: resource.brand,
      category: resource.category as ProductCategory,
      description: resource.description,
      benefits: resource.benefits ?? [],
      isAiRecommended: resource.aiRecommended ?? false,
      imageUrl: resource.imageUrl ?? '',
    });
  }

  toResourceFromEntity(entity: Product): ProductResource {
    return {
      id: entity.id,
      name: entity.name,
      brand: entity.brand,
      category: entity.category,
      description: entity.description,
      benefits: entity.benefits,
      aiRecommended: entity.isAiRecommended,
      imageUrl: entity.imageUrl,
    } as ProductResource;
  }
}
