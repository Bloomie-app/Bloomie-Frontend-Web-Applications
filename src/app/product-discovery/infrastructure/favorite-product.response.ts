import {BaseResource, BaseResponse} from '../../shared/infrastructure/base-response';

/**
 * Resource representation of a user's saved favorite product returned by the API.
 */
export interface FavoriteProductResource extends BaseResource {
  /** Unique identifier for the favorite product record. */
  id:        number;
  /** Identifier of the user who saved the product. */
  userId:    number;
  /** Identifier of the product that was saved. */
  productId: number;
  /** ISO 8601 date-time string for when the product was saved as a favorite. */
  savedAt:   string;
}

/**
 * Response envelope for favorite product collection queries.
 */
export interface FavoriteProductsResponse extends BaseResponse {
  /** The list of favorite product records returned by the API. */
  favoriteProducts: FavoriteProductResource[];
}
