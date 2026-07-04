import {Component, inject, OnInit, signal} from '@angular/core';
import {Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {TranslatePipe} from '@ngx-translate/core';
import {take} from 'rxjs';
import {DermatologyCareStore} from '../../../application/dermatology-care.store';
import {IamStore} from '../../../../iam/application/iam.store';

@Component({
  selector:    'app-derm-consultation-summary',
  imports:     [MatIconModule, TranslatePipe],
  templateUrl: './derm-consultation-summary.html',
  styleUrl:    './derm-consultation-summary.css',
})
export class DermConsultationSummary implements OnInit {
  readonly store        = inject(DermatologyCareStore);
  private readonly iamStore = inject(IamStore);
  protected router      = inject(Router);

  patientName  = signal<string>('');
  patientPhoto = signal<string | null>(null);

  ngOnInit(): void {
    const consultation = this.store.selectedConsultation();
    if (consultation) {
      this.iamStore.getUserById(consultation.patientId)
        .pipe(take(1))
        .subscribe({
          next: user => {
            this.patientName.set(`${user.name} ${user.lastName}`);
            this.patientPhoto.set(user.photoUrl ?? null);
          },
          error: () => {},
        });
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  navigateBack(): void {
    this.router.navigate(['/derm/past-consultations']);
  }
}
