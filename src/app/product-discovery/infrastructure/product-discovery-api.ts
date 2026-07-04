import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Product } from '../domain/model/product.entity';
import { ProductCompatibility } from '../domain/model/product-compatibility.entity';
import { FavoriteProduct } from '../domain/model/favorite-product.entity';
import { ProductsApiEndpoint } from './products-api-endpoint';
import { ProductCompatibilitiesApiEndpoint } from './product-compatibilities-api-endpoint';
import { FavoriteProductsApiEndpoint } from './favorite-products-api-endpoint';

/**
 * Infrastructure facade for product discovery endpoint operations.
 */
@Injectable({ providedIn: 'root' })
export class ProductDiscoveryApi extends BaseApi {
  private readonly productsEndpoint: ProductsApiEndpoint;
  private readonly productCompatibilitiesEndpoint: ProductCompatibilitiesApiEndpoint;
  private readonly favoriteProductsEndpoint: FavoriteProductsApiEndpoint;

  /**
   * Creates an instance of ProductDiscoveryApi.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(http: HttpClient) {
    super();
    this.productsEndpoint = new ProductsApiEndpoint(http);
    this.productCompatibilitiesEndpoint = new ProductCompatibilitiesApiEndpoint(http);
    this.favoriteProductsEndpoint = new FavoriteProductsApiEndpoint(http);
  }

  /**
   * Retrieves all skincare products.
   * @returns Stream with the product collection.
   */
  getProducts(): Observable<Product[]> {
    return this.productsEndpoint.getAll();
  }

  /**
   * Retrieves a single product by ID.
   * @param id - The ID of the product.
   * @returns Stream with the matched Product entity.
   */
  getProduct(id: number): Observable<Product> {
    return this.productsEndpoint.getById(id);
  }

  /**
   * Retrieves compatibility evaluations for a specific product across all skin types.
   * @param productId - The product ID to filter by.
   * @returns Stream with the filtered compatibility collection.
   */
  getProductCompatibilitiesByProductId(productId: number): Observable<ProductCompatibility[]> {
    return this.productCompatibilitiesEndpoint.getByProductId(productId);
  }

  /**
   * Retrieves all favorite product records.
   * @returns Stream with the favorite product collection.
   */
  getFavoriteProducts(): Observable<FavoriteProduct[]> {
    return this.favoriteProductsEndpoint.getAll();
  }

  /**
   * Saves a new favorite product record.
   * @param favoriteProduct - The favorite product record to create.
   * @returns Stream with the created FavoriteProduct entity.
   */
  saveFavoriteProduct(favoriteProduct: FavoriteProduct): Observable<FavoriteProduct> {
    return this.favoriteProductsEndpoint.create(favoriteProduct);
  }

  /**
   * Removes a favorite product record by ID.
   * @param id - The ID of the favorite product record to delete.
   * @returns Completion stream for the delete operation.
   */
  removeFavoriteProduct(id: number): Observable<void> {
    return this.favoriteProductsEndpoint.delete(id);
  }
}
