import { HttpClient } from '@angular/common/http';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { FavoriteProduct } from '../domain/model/favorite-product.entity';
import { FavoriteProductResource, FavoriteProductsResponse } from './favorite-product.response';
import { FavoriteProductAssembler } from './favorite-product.assembler';
import { environment } from '../../../environments/environment';

/**
 * Endpoint client for favorite product CRUD operations.
 */
export class FavoriteProductsApiEndpoint extends BaseApiEndpoint<
  FavoriteProduct,
  FavoriteProductResource,
  FavoriteProductsResponse,
  FavoriteProductAssembler
> {
  /**
   * Creates an instance of FavoriteProductsApiEndpoint.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.backendBasePath}${environment.backendFavoriteProductsEndpointPath}`,
      new FavoriteProductAssembler(),
    );
  }
}
