import {BaseResource, BaseResponse} from '../../shared/infrastructure/base-response';

/**
 * Resource representation of a skincare product returned by the API.
 */
export interface ProductResource extends BaseResource {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  benefits: string[];
  aiRecommended: boolean;
  imageUrl?: string;
}

/**
 * Response envelope for product collection queries.
 */
export interface ProductsResponse extends BaseResponse {
  /** The list of products returned by the API. */
  products: ProductResource[];
}
