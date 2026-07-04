import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ProductDiscoveryStore } from '../../../application/product-discovery.store';
import { FavoriteProduct } from '../../../domain/model/favorite-product.entity';
import { IamStore } from '../../../../iam/application/iam.store';
import { SkinAnalysisStore } from '../../../../skin-analysis/application/skin-analysis.store';

/**
 * Displays the full detail of a selected skincare product,
 * including AI skin compatibility score, description, and key benefits.
 */
@Component({
  selector: 'app-product-detail',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail {
  readonly store = inject(ProductDiscoveryStore);
  protected router = inject(Router);
  private readonly iamStore = inject(IamStore);
  private readonly skinAnalysisStore = inject(SkinAnalysisStore);

  /**
   * Computed compatibility record for the selected product and the user's skin type.
   */
  readonly compatibility = computed(() => {
    const product = this.store.selectedProduct();
    const skinType = this.skinAnalysisStore.skinProfile()?.skinType;
    if (!product || !skinType) return undefined;
    return this.store.getCompatibilityForProduct(product.id, skinType)();
  });

  /**
   * Computed favorite state for the selected product.
   */
  readonly isFavorite = computed(() => {
    const product = this.store.selectedProduct();
    if (!product) return false;
    return this.store.favorites().some((favorite) => favorite.matchesProduct(product.id));
  });

  /**
   * Toggles the selected product in or out of the favorites list.
   */
  toggleFavorite(): void {
    const product = this.store.selectedProduct();
    if (!product) return;
    const existingFavorite = this.store
      .favorites()
      .find((favorite) => favorite.matchesProduct(product.id));
    if (existingFavorite) {
      this.store.removeFavoriteProduct(existingFavorite.id);
    } else {
      const newFavorite = new FavoriteProduct({
        id: 0,
        userId: this.iamStore.currentUser()?.id ?? 0,
        productId: product.id,
        savedAt: new Date().toISOString(),
      });
      this.store.saveFavoriteProduct(newFavorite);
    }
  }

  /**
   * Navigates back to the trending items list.
   */
  navigateBack(): void {
    this.router.navigate(['/trending']);
  }

  /**
   * Hides a broken product image and falls back to the placeholder icon.
   * @param event - The image error event.
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const parent = img.parentElement;
    img.remove();
    if (parent) {
      parent.innerHTML +=
        '<div class="pd-image__deco pd-image__deco--1"></div>' +
        '<div class="pd-image__deco pd-image__deco--2"></div>' +
        '<mat-icon class="pd-image__icon material-icons">inventory_2</mat-icon>';
    }
  }
}
