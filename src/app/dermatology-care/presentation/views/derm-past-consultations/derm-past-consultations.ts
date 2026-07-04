import {Component, computed, effect, inject, signal, untracked} from '@angular/core';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {SlicePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {take} from 'rxjs';
import {DermatologyCareStore} from '../../../application/dermatology-care.store';
import {Consultation} from '../../../domain/model/consultation.entity';
import {IamStore} from '../../../../iam/application/iam.store';

@Component({
  selector:    'app-derm-past-consultations',
  imports:     [MatIconModule, FormsModule, TranslatePipe, SlicePipe],
  templateUrl: './derm-past-consultations.html',
  styleUrl:    './derm-past-consultations.css',
})
export class DermPastConsultations {
  readonly store        = inject(DermatologyCareStore);
  private readonly iamStore = inject(IamStore);
  protected router      = inject(Router);

  searchQuery  = signal<string>('');
  patientNames = signal<Record<number, string>>({});

  protected readonly userPhotoMap = signal<Record<number, string | null>>({});

  constructor() {
    effect(() => {
      const consultations = this.store.myConsultations();
      const loaded        = untracked(() => this.userPhotoMap());

      consultations.forEach(c => {
        const userId = c.patientId;
        if (!(userId in loaded)) {
          this.userPhotoMap.update(m => ({...m, [userId]: null}));
          this.iamStore.getUserById(userId)
            .pipe(take(1))
            .subscribe({
              next: user => {
                this.userPhotoMap.update(m => ({...m, [userId]: user.photoUrl ?? null}));
                this.patientNames.update(n => ({...n, [userId]: `${user.name} ${user.lastName}`}));
              },
              error: () => {},
            });
        }
      });
    }, { allowSignalWrites: true });
  }

  protected patientPhotoForConsultation(consultation: Consultation): string | null {
    return this.userPhotoMap()[consultation.patientId] ?? null;
  }

  getPatientName(patientId: number): string {
    return this.patientNames()[patientId] ?? `Patient #${patientId}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  readonly filteredConsultations = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.store.myConsultations().filter(consultation =>
      !query
      || consultation.notes.toLowerCase().includes(query)
      || consultation.recommendations.toLowerCase().includes(query)
    );
  });

  selectConsultation(consultation: Consultation): void {
    this.store.selectConsultation(consultation);
    this.router.navigate(['/derm/consultation-summary']);
  }

  navigateBack(): void {
    this.router.navigate(['/derm/agenda']);
  }
}
