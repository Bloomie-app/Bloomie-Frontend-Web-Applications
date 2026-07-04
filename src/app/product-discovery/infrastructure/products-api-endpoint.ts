import {HttpClient} from '@angular/common/http';
import {BaseApiEndpoint} from '../../shared/infrastructure/base-api-endpoint';
import {Product} from '../domain/model/product.entity';
import {ProductResource, ProductsResponse} from './product.response';
import {ProductAssembler} from './product.assembler';
import {environment} from '../../../environments/environment';

/**
 * Endpoint client for product CRUD operations.
 */
export class ProductsApiEndpoint extends BaseApiEndpoint<
  Product,
  ProductResource,
  ProductsResponse,
  ProductAssembler
> {
  /**
   * Creates an instance of ProductsApiEndpoint.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.backendBasePath}${environment.backendProductsEndpointPath}`,
      new ProductAssembler(),
    );
  }
}
