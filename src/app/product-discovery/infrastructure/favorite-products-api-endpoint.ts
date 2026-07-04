import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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

  /**
   * Fetches all favorite product records belonging to a specific user.
   * The backend requires the `userId` query parameter on this endpoint.
   * @param userId - The identifier of the user whose favorites should be retrieved.
   * @returns Stream with the mapped favorite product collection.
   */
  getAllByUserId(userId: number): Observable<FavoriteProduct[]> {
    return this.http.get<FavoriteProductResource[]>(
      `${this.endpointUrl}?userId=${userId}`,
    ).pipe(
      map(resources => resources.map(r => this.assembler.toEntityFromResource(r))),
      catchError(this.handleError('Failed to fetch favorite products')),
    );
  }
}
