import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { ProductCompatibility } from '../domain/model/product-compatibility.entity';
import {
  ProductCompatibilityResource,
  ProductCompatibilitiesResponse,
} from './product-compatibility.response';
import { ProductCompatibilityAssembler } from './product-compatibility.assembler';
import { environment } from '../../../environments/environment';

/**
 * Endpoint client for product compatibility CRUD operations.
 */
export class ProductCompatibilitiesApiEndpoint extends BaseApiEndpoint<
  ProductCompatibility,
  ProductCompatibilityResource,
  ProductCompatibilitiesResponse,
  ProductCompatibilityAssembler
> {
  /**
   * Creates an instance of ProductCompatibilitiesApiEndpoint.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.backendBasePath}${environment.backendProductCompatibilitiesEndpointPath}`,
      new ProductCompatibilityAssembler(),
    );
  }

  /**
   * Retrieves compatibility evaluations for a specific product across all skin types.
   * @param productId - The product ID to filter by.
   * @returns Stream with the filtered compatibility collection.
   */
  getByProductId(productId: number): Observable<ProductCompatibility[]> {
    return this.http.get<ProductCompatibilityResource[]>(
      `${this.endpointUrl}?productId=${productId}`,
    ).pipe(
      map(resources => resources.map(r => this.assembler.toEntityFromResource(r))),
      catchError(this.handleError('Failed to fetch compatibilities for product')),
    );
  }
}
