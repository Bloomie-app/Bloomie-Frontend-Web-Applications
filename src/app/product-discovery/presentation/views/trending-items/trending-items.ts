import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ProductDiscoveryStore } from '../../../application/product-discovery.store';
import { ProductCategory } from '../../../domain/model/product.entity';
import { FavoriteProduct } from '../../../domain/model/favorite-product.entity';
import { IamStore } from '../../../../iam/application/iam.store';

/**
 * Displays the full skincare product catalog with search,
 * category filter, AI recommendation filter, and favorites tab.
 */
@Component({
  selector: 'app-trending-items',
  imports: [MatIconModule, FormsModule, TranslatePipe],
  templateUrl: './trending-items.html',
  styleUrl: './trending-items.css',
})
export class TrendingItems {
  readonly store = inject(ProductDiscoveryStore);
  protected router = inject(Router);
  private readonly iamStore = inject(IamStore);

  /** Exposes the ProductCategory enum to the template. */
  readonly ProductCategory = ProductCategory;

  /** All available category filter options. */
  readonly categories: ProductCategory[] = [
    ProductCategory.Cleanser,
    ProductCategory.Toner,
    ProductCategory.Serum,
    ProductCategory.Moisturizer,
    ProductCategory.Sunscreen,
  ];

  /** Controls visibility of the filter panel. */
  showFilterPanel = signal<boolean>(false);

  /** Draft category selections while the filter panel is open. */
  draftCategories = signal<ProductCategory[]>([]);

  /** Draft AI filter state while the filter panel is open. */
  draftAiFilterActive = signal<boolean>(false);

  /** Controls whether the favorites tab or all-products tab is active. */
  showFavoritesOnly = signal<boolean>(false);

  /**
   * Computed list of products applying the store filters plus the favorites tab.
   * When the favorites tab is active, only products saved as favorites are shown.
   */
  readonly displayedProducts = computed(() => {
    const filtered = this.store.filteredProducts();
    if (!this.showFavoritesOnly()) return filtered;
    const favoriteProductIds = new Set(
      this.store.favorites().map((favorite) => favorite.productId),
    );
    return filtered.filter((product) => favoriteProductIds.has(product.id));
  });

  /**
   * Computed count of products currently saved as favorites.
   */
  readonly favoriteCount = computed(() => this.store.favorites().length);

  /**
   * Opens the filter panel and copies current store filter state into drafts.
   */
  openFilterPanel(): void {
    this.draftCategories.set(this.store.selectedCategory() ? [this.store.selectedCategory()!] : []);
    this.draftAiFilterActive.set(this.store.aiFilterActive());
    this.showFilterPanel.set(true);
  }

  /**
   * Applies the draft filter selections to the store and closes the panel.
   */
  applyFilters(): void {
    const category = this.draftCategories().length > 0 ? this.draftCategories()[0] : null;
    this.store.filterByCategory(category);
    if (this.draftAiFilterActive() !== this.store.aiFilterActive()) {
      this.store.toggleAiFilter();
    }
    this.showFilterPanel.set(false);
  }

  /**
   * Clears all draft filter selections without applying them.
   */
  clearDraftFilters(): void {
    this.draftCategories.set([]);
    this.draftAiFilterActive.set(false);
  }

  /**
   * Selects a single category in the draft filter, replacing any previous selection.
   * Clicking the already-selected category deselects it (radio-button behavior).
   * @param category - The category to select or deselect.
   */
  toggleDraftCategory(category: ProductCategory): void {
    this.draftCategories.update((current) =>
      current.includes(category) ? [] : [category],
    );
  }

  /**
   * Updates the store search query as the user types.
   * @param query - The current search input value.
   */
  onSearchChange(query: string): void {
    this.store.searchProducts(query);
  }

  /**
   * Removes the active category filter chip.
   */
  clearCategoryFilter(): void {
    this.store.filterByCategory(null);
  }

  /**
   * Removes the active AI filter chip.
   */
  clearAiFilter(): void {
    this.store.toggleAiFilter();
  }

  /**
   * Toggles between the All Products and Favourites tab.
   * @param showFavorites - True to show only favorites, false for all.
   */
  setFavoritesTab(showFavorites: boolean): void {
    this.showFavoritesOnly.set(showFavorites);
  }

  /**
   * Toggles a product in or out of the favorites list.
   * If it is already a favorite it removes it; otherwise it saves a new record.
   * @param productId - The ID of the product to toggle.
   * @param event     - The click event, stopped to prevent card navigation.
   */
  toggleFavorite(productId: number, event: Event): void {
    event.stopPropagation();
    const existingFavorite = this.store
      .favorites()
      .find((favorite) => favorite.matchesProduct(productId));
    if (existingFavorite) {
      this.store.removeFavoriteProduct(existingFavorite.id);
    } else {
      const newFavorite = new FavoriteProduct({
        id: 0,
        userId: this.iamStore.currentUser()?.id ?? 0,
        productId: productId,
        savedAt: new Date().toISOString(),
      });
      this.store.saveFavoriteProduct(newFavorite);
    }
  }

  /**
   * Returns true if the given product is in the current favorites list.
   * @param productId - The product identifier to check.
   */
  isFavorite(productId: number): boolean {
    return this.store.favorites().some((favorite) => favorite.matchesProduct(productId));
  }

  /**
   * Navigates to the product detail screen for the selected product.
   * @param productId - The ID of the product to view.
   */
  navigateToDetail(productId: number): void {
    const product = this.store.products().find((p) => p.id === productId);
    if (product) {
      this.store.selectProduct(product);
      this.router.navigate(['/trending/detail']);
    }
  }

  /**
   * Navigates back to the dashboard.
   */
  navigateBack(): void {
    this.router.navigate(['/dashboard']);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.innerHTML = '<span class="material-icons">inventory_2</span>';
    }
  }
}
