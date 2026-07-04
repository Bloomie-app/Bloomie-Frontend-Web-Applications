import {BaseEntity} from '../../../shared/infrastructure/base-entity';

/**
 * Represents the available skincare product categories.
 */
export enum ProductCategory {
  Cleanser    = 'CLEANSER',
  Toner       = 'TONER',
  Serum       = 'SERUM',
  Moisturizer = 'MOISTURIZER',
  Sunscreen   = 'SUNSCREEN',
}

/**
 * Represents a skincare product available in the discovery catalog.
 */
export class Product implements BaseEntity {
  /**
   * Creates a new Product entity.
   * @param props - Initialization values for the product.
   */
  constructor(props: {
    id: number;
    name: string;
    brand: string;
    category: ProductCategory;
    description: string;
    benefits: string[];
    isAiRecommended: boolean;
    imageUrl?: string;
  }) {
    this._id = props.id;
    this._name = props.name;
    this._brand = props.brand;
    this._category = props.category;
    this._description = props.description;
    this._benefits = props.benefits;
    this._isAiRecommended = props.isAiRecommended;
    this._imageUrl = props.imageUrl ?? '';
  }
  private _imageUrl: string;
  get imageUrl(): string {
    return this._imageUrl;
  }

  /** Unique identifier for the product. */
  private _id: number;

  get id(): number {
    return this._id;
  }
  set id(value: number) {
    this._id = value;
  }

  /** Display name of the product. */
  private _name: string;

  get name(): string {
    return this._name;
  }

  /** Brand that manufactures the product. */
  private _brand: string;

  get brand(): string {
    return this._brand;
  }

  /** Skincare category this product belongs to. */
  private _category: ProductCategory;

  get category(): ProductCategory {
    return this._category;
  }

  /** Detailed description of the product and its purpose. */
  private _description: string;

  get description(): string {
    return this._description;
  }

  /** List of key benefits provided by the product. */
  private _benefits: string[];

  get benefits(): string[] {
    return this._benefits;
  }

  /**
   * Whether this product has been flagged as AI-recommended
   * based on the user's skin profile.
   */
  private _isAiRecommended: boolean;

  get isAiRecommended(): boolean {
    return this._isAiRecommended;
  }

  /**
   * Returns true if the product has at least one key benefit listed.
   */
  get hasBenefits(): boolean {
    return this._benefits.length > 0;
  }

  /**
   * Returns a display label combining brand and product name.
   */
  get fullLabel(): string {
    return `${this._brand} · ${this._name}`;
  }

  /**
   * Returns true if the product belongs to the given category.
   * @param category - The category to check against.
   */
  belongsToCategory(category: ProductCategory): boolean {
    return this._category === category;
  }
}
