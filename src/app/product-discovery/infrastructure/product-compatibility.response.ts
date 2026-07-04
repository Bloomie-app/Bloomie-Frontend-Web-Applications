import {BaseResource, BaseResponse} from '../../shared/infrastructure/base-response';

/**
 * Resource representation of a product compatibility evaluation returned by the API.
 */
export interface ProductCompatibilityResource extends BaseResource {
  /** Unique identifier for the compatibility record. */
  id:                  number;
  /** Identifier of the product being evaluated. */
  productId:           number;
  /** Target skin type (OILY, DRY, SENSITIVE, COMBINATION, NORMAL). */
  skinType:            string;
  /** Numeric score from 0 to 100 representing compatibility with the skin type. */
  compatibilityScore:  number;
  /** One-sentence explanation of the compatibility result. */
  reason:              string;
}

/**
 * Response envelope for product compatibility collection queries.
 */
export interface ProductCompatibilitiesResponse extends BaseResponse {
  /** The list of product compatibility records returned by the API. */
  product_compatibilities: ProductCompatibilityResource[];
}
