import { computed, DestroyRef, inject, Injectable, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { retry } from 'rxjs';
import { Product, ProductCategory } from '../domain/model/product.entity';
import { ProductCompatibility } from '../domain/model/product-compatibility.entity';
import { FavoriteProduct } from '../domain/model/favorite-product.entity';
import { ProductDiscoveryApi } from '../infrastructure/product-discovery-api';
import { IamStore } from '../../iam/application/iam.store';

/**
 * Holds product discovery application state and coordinates
 * product browsing, compatibility evaluation, and favorites behavior.
 */
@Injectable({ providedIn: 'root' })
export class ProductDiscoveryStore {
  private readonly productsSignal = signal<Product[]>([]);
  private readonly compatibilitiesSignal = signal<ProductCompatibility[]>([]);
  private readonly favoritesSignal = signal<FavoriteProduct[]>([]);
  private readonly selectedProductSignal = signal<Product | null>(null);
  private readonly searchQuerySignal = signal<string>('');
  private readonly selectedCategorySignal = signal<ProductCategory | null>(null);
  private readonly aiFilterActiveSignal = signal<boolean>(false);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  /**
   * Readonly signal for the full list of products.
   */
  readonly products = this.productsSignal.asReadonly();

  /**
   * Readonly signal for the full list of product compatibility records.
   */
  readonly compatibilities = this.compatibilitiesSignal.asReadonly();

  /**
   * Readonly signal for the current user's favorite product records.
   * Filters out favorite records belonging to other users.
   */
  readonly favorites = computed(() => {
    const currentUserId = this.iamStore.currentUser()?.id ?? -1;
    return this.favoritesSignal().filter((favorite) => favorite.belongsToUser(currentUserId));
  });

  /**
   * Readonly signal for the currently selected product.
   */
  readonly selectedProduct = this.selectedProductSignal.asReadonly();

  /**
   * Readonly signal for the active search query string.
   */
  readonly searchQuery = this.searchQuerySignal.asReadonly();

  /**
   * Readonly signal for the active category filter.
   */
  readonly selectedCategory = this.selectedCategorySignal.asReadonly();

  /**
   * Readonly signal indicating whether the AI-recommended-only filter is active.
   */
  readonly aiFilterActive = this.aiFilterActiveSignal.asReadonly();

  /**
   * Readonly signal indicating if data is loading.
   */
  readonly loading = this.loadingSignal.asReadonly();

  /**
   * Readonly signal for the current error message.
   */
  readonly error = this.errorSignal.asReadonly();

  /**
   * Computed signal for the list of products filtered by search query,
   * selected category, and AI recommendation filter.
   */
  readonly filteredProducts = computed(() => {
    const query = this.searchQuerySignal().toLowerCase().trim();
    const category = this.selectedCategorySignal();
    const aiOnly = this.aiFilterActiveSignal();

    return this.productsSignal().filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query);
      const matchesCategory = !category || product.belongsToCategory(category);
      const matchesAi = !aiOnly || product.isAiRecommended;
      return matchesSearch && matchesCategory && matchesAi;
    });
  });

  /**
   * Computed signal for the total number of products in the catalog.
   */
  readonly productCount = computed(() => this.productsSignal().length);

  /**
   * Computed signal for the number of products currently visible after filters.
   */
  readonly filteredProductCount = computed(() => this.filteredProducts().length);

  /**
   * Computed signal for the number of saved favorite products.
   */
  readonly favoriteCount = computed(() => this.favorites().length);

  /**
   * Computed signal for the count of AI-recommended products in the catalog.
   */
  readonly aiRecommendedCount = computed(
    () => this.productsSignal().filter((product) => product.isAiRecommended).length,
  );

  private readonly destroyRef = inject(DestroyRef);
  private readonly iamStore = inject(IamStore);

  /**
   * Creates an instance of ProductDiscoveryStore and loads initial data.
   * @param productDiscoveryApi - The API service for product discovery data.
   */
  constructor(private productDiscoveryApi: ProductDiscoveryApi) {
    this.loadProducts();
    this.loadFavoriteProducts();
  }

  /**
   * Sets the active search query to filter products by name or brand.
   * @param query - The search string entered by the user.
   */
  searchProducts(query: string): void {
    this.searchQuerySignal.set(query);
  }

  /**
   * Sets the active category filter.
   * Passing null clears the category filter and shows all categories.
   * @param category - The product category to filter by, or null to clear.
   */
  filterByCategory(category: ProductCategory | null): void {
    this.selectedCategorySignal.set(category);
  }

  /**
   * Toggles the AI-recommended-only filter on or off.
   */
  toggleAiFilter(): void {
    this.aiFilterActiveSignal.update((active) => !active);
  }

  /**
   * Clears all active filters (search query, category, and AI filter).
   */
  clearFilters(): void {
    this.searchQuerySignal.set('');
    this.selectedCategorySignal.set(null);
    this.aiFilterActiveSignal.set(false);
  }

  /**
   * Sets the currently selected product for detail viewing and loads
   * its compatibility evaluations across all skin types.
   * @param product - The product to select.
   */
  selectProduct(product: Product): void {
    this.selectedProductSignal.set(product);
    this.loadCompatibilitiesForProduct(product.id);
  }

  /**
   * Selects a product by identifier from the loaded product list.
   * @param id - The product identifier.
   * @returns Reactive selection for the requested product.
   */
  getProductById(id: number): Signal<Product | undefined> {
    return computed(() =>
      id ? this.productsSignal().find((product) => product.id === id) : undefined,
    );
  }

  /**
   * Returns the compatibility record for a given product and skin type.
   * @param productId - The product identifier.
   * @param skinType  - The target skin type (OILY, DRY, SENSITIVE, COMBINATION, NORMAL).
   * @returns Reactive selection for the matched compatibility record.
   */
  getCompatibilityForProduct(
    productId: number,
    skinType: string,
  ): Signal<ProductCompatibility | undefined> {
    return computed(() =>
      this.compatibilitiesSignal().find(
        (compatibility) =>
          compatibility.productId === productId && compatibility.skinType === skinType,
      ),
    );
  }

  /**
   * Returns true if the given product is in the user's favorites list.
   * @param productId - The product identifier to check.
   * @returns Reactive boolean signal.
   */
  isProductFavorite(productId: number): Signal<boolean> {
    return computed(() =>
      this.favorites().some((favorite) => favorite.matchesProduct(productId)),
    );
  }

  /**
   * Saves a product to the user's favorites list.
   * @param favoriteProduct - The favorite product record to persist.
   */
  saveFavoriteProduct(favoriteProduct: FavoriteProduct): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.productDiscoveryApi
      .saveFavoriteProduct(favoriteProduct)
      .pipe(retry(2))
      .subscribe({
        next: (createdFavorite) => {
          this.favoritesSignal.update((favorites) => [...favorites, createdFavorite]);
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to save favorite product'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Removes a product from the user's favorites list by favorite record ID.
   * @param favoriteId - The ID of the favorite product record to remove.
   */
  removeFavoriteProduct(favoriteId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.productDiscoveryApi
      .removeFavoriteProduct(favoriteId)
      .pipe(retry(2))
      .subscribe({
        next: () => {
          this.favoritesSignal.update((favorites) =>
            favorites.filter((favorite) => favorite.id !== favoriteId),
          );
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to remove favorite product'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Loads all products from the API.
   */
  private loadProducts(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.productDiscoveryApi
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.productsSignal.set(products);
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load products'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Loads compatibility evaluations for a specific product across all skin types.
   * @param productId - The product identifier to load compatibilities for.
   */
  private loadCompatibilitiesForProduct(productId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.productDiscoveryApi
      .getProductCompatibilitiesByProductId(productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (compatibilities) => {
          this.compatibilitiesSignal.update((existing) => [
            ...existing.filter((compatibility) => compatibility.productId !== productId),
            ...compatibilities,
          ]);
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load product compatibilities'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Loads all favorite product records from the API.
   */
  private loadFavoriteProducts(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.productDiscoveryApi
      .getFavoriteProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (favorites) => {
          this.favoritesSignal.set(favorites);
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load favorite products'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Normalizes unknown errors into a display-friendly message.
   * @param error    - Source error.
   * @param fallback - Default message when details are unavailable.
   * @returns Normalized message string.
   */
  private formatError(error: any, fallback: string): string {
    if (error instanceof Error) {
      return error.message.includes('Resource not found')
        ? `${fallback}: Not found`
        : error.message;
    }
    return fallback;
  }
}
