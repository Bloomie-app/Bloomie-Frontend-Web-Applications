import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { take } from 'rxjs';
import { DermatologyCareStore } from '../../../application/dermatology-care.store';
import { DermatologistProfile } from '../../../domain/model/dermatologist-profile.entity';
import { IamStore } from '../../../../iam/application/iam.store';

interface PriceRange {
  labelKey: string;
  min:      number;
  max:      number;
}

@Component({
  selector:    'app-select-doctor',
  imports:     [MatIconModule, FormsModule, TranslatePipe],
  templateUrl: './select-doctor.html',
  styleUrl:    './select-doctor.css',
})
export class SelectDoctor {
  readonly store        = inject(DermatologyCareStore);
  private readonly iamStore = inject(IamStore);
  protected router      = inject(Router);

  searchQuery      = signal<string>('');
  selectedPriceIdx = signal<number>(0);

  protected readonly userPhotoMap = signal<Record<number, string | null>>({});

  constructor() {
    effect(() => {
      const profiles = this.store.dermatologistProfiles();
      const loaded   = untracked(() => this.userPhotoMap());
      profiles
        .filter(p => !(p.userId in loaded))
        .forEach(p => {
          this.userPhotoMap.update(m => ({ ...m, [p.userId]: null }));
          this.iamStore.getUserById(p.userId)
            .pipe(take(1))
            .subscribe({
              next: user => this.userPhotoMap.update(m => ({ ...m, [p.userId]: user.photoUrl ?? null })),
              error: () => {},
            });
        });
    }, { allowSignalWrites: true });
  }

  readonly priceRanges: PriceRange[] = [
    { labelKey: 'dermatology.selectDoctor.allPrices', min: 0,  max: Infinity },
    { labelKey: 'dermatology.selectDoctor.under30',   min: 0,  max: 29 },
    { labelKey: 'dermatology.selectDoctor.range3035', min: 30, max: 35 },
    { labelKey: 'dermatology.selectDoctor.over35',    min: 36, max: Infinity },
  ];

  readonly filteredDermatologists = computed(() => {
    const query      = this.searchQuery().toLowerCase();
    const priceRange = this.priceRanges[this.selectedPriceIdx()];
    return this.store.dermatologistProfiles().filter(d => {
      const matchesSearch = !query
        || d.specialty.toLowerCase().includes(query)
        || d.fullName.toLowerCase().includes(query);
      const matchesPrice = d.consultationFee >= priceRange.min && d.consultationFee <= priceRange.max;
      return matchesSearch && matchesPrice;
    });
  });

  readonly resultCount = computed(() => this.filteredDermatologists().length);

  protected photoForDermatologist(profile: DermatologistProfile): string | null {
    return this.userPhotoMap()[profile.userId] ?? null;
  }

  protected initialsFor(profile: DermatologistProfile): string {
    const source = profile.fullName || profile.specialty;
    return source
      .split(' ')
      .map((w: string) => w[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  protected displayName(profile: DermatologistProfile): string {
    return profile.fullName ? `Dr. ${profile.fullName}` : profile.specialty;
  }

  selectDermatologist(profile: DermatologistProfile): void {
    this.store.selectDermatologist(profile);
    this.router.navigate(['/dermatology/book-appointment']);
  }

  selectPriceRange(index: number): void { this.selectedPriceIdx.set(index); }
  navigateBack(): void { this.router.navigate(['/dermatology']); }
}
