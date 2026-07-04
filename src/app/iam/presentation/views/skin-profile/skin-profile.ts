import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { SkinAnalysisStore } from '../../../../skin-analysis/application/skin-analysis.store';
import { SkinProfile, SkinType } from '../../../../skin-analysis/domain/model/skin-profile.entity';

@Component({
  selector: 'app-skin-profile',
  standalone: true,
  imports: [MatIconModule, TranslatePipe, FormsModule],
  templateUrl: './skin-profile.html',
  styleUrl: './skin-profile.css',
})
export class SkinProfileView implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(SkinAnalysisStore);

  protected skinType = signal<string>('Normal skin');
  protected waterIntake = signal<string>('3 - 5 glasses');
  protected sunExposure = signal<string>('30 - 60 minutes');
  protected sleepHabits = signal<string>('8 hours');
  protected saveSuccess = signal<boolean>(false);
  protected saving = signal<boolean>(false);

  readonly skinTypeOptions = [
    'Normal skin',
    'Oily skin',
    'Dry skin',
    'Combination skin',
    'Sensitive skin',
  ];
  readonly waterOptions = [
    'Less than 3 glasses',
    '3 - 5 glasses',
    '5 - 9 glasses',
    'More than 9 glasses',
  ];
  readonly sunOptions = [
    'Less than 15 minutes',
    '15 - 30 minutes',
    '30 - 60 minutes',
    'More than 1 hour',
  ];
  readonly sleepOptions = [
    'Less than 5 hours',
    '5 - 6 hours',
    '6 hours',
    '7 - 8 hours',
    '8 hours',
    'More than 8 hours',
  ];

  readonly skinTypeLabelKeys: Record<string, string> = {
    'Normal skin': 'iam.skinProfile.skinTypes.normal',
    'Oily skin': 'iam.skinProfile.skinTypes.oily',
    'Dry skin': 'iam.skinProfile.skinTypes.dry',
    'Combination skin': 'iam.skinProfile.skinTypes.combination',
    'Sensitive skin': 'iam.skinProfile.skinTypes.sensitive',
  };
  readonly waterLabelKeys: Record<string, string> = {
    'Less than 3 glasses': 'iam.skinProfile.waterOptions.lessThan3',
    '3 - 5 glasses': 'iam.skinProfile.waterOptions.3to5',
    '5 - 9 glasses': 'iam.skinProfile.waterOptions.5to9',
    'More than 9 glasses': 'iam.skinProfile.waterOptions.moreThan9',
  };
  readonly sunLabelKeys: Record<string, string> = {
    'Less than 15 minutes': 'iam.skinProfile.sunOptions.lessThan15',
    '15 - 30 minutes': 'iam.skinProfile.sunOptions.15to30',
    '30 - 60 minutes': 'iam.skinProfile.sunOptions.30to60',
    'More than 1 hour': 'iam.skinProfile.sunOptions.moreThan1h',
  };
  readonly skinTypeIcons: Record<string, string> = {
    'Normal skin': 'spa',
    'Oily skin': 'water_drop',
    'Dry skin': 'thermostat',
    'Combination skin': 'tune',
    'Sensitive skin': 'favorite',
  };
  readonly sleepLabelKeys: Record<string, string> = {
    'Less than 5 hours': 'iam.skinProfile.sleepOptions.lessThan5',
    '5 - 6 hours': 'iam.skinProfile.sleepOptions.5to6',
    '6 hours': 'iam.skinProfile.sleepOptions.6hours',
    '7 - 8 hours': 'iam.skinProfile.sleepOptions.7to8',
    '8 hours': 'iam.skinProfile.sleepOptions.8hours',
    'More than 8 hours': 'iam.skinProfile.sleepOptions.moreThan8',
  };

  ngOnInit(): void {
    const profile = this.store.skinProfile();
    if (profile) {
      this.skinType.set(this.mapSkinTypeToLabel(profile.skinType));
      if (profile.waterIntake) this.waterIntake.set(profile.waterIntake);
      if (profile.sunExposure) this.sunExposure.set(profile.sunExposure);
      if (profile.sleepHours) this.sleepHabits.set(profile.sleepHours);
    }
  }

  onSave(): void {
    this.saving.set(true);
    const profile = this.store.skinProfile();

    if (profile) {
      const updatedProfile = new SkinProfile({
        id: profile.id,
        userId: profile.userId,
        skinType: this.mapLabelToSkinType(this.skinType()),
        sensitivity: profile.sensitivity,
        waterIntake: this.waterIntake(),
        sunExposure: this.sunExposure(),
        sleepHours: this.sleepHabits(),
        status: profile.status,
      });
      this.store.updateSkinProfile(updatedProfile);
    }

    setTimeout(() => {
      this.saving.set(false);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 2000);
    }, 600);
  }

  onBack(): void {
    this.router.navigate(['/profile']).then();
  }

  private mapSkinTypeToLabel(skinType: SkinType): string {
    const map: Record<SkinType, string> = {
      [SkinType.Normal]: 'Normal skin',
      [SkinType.Oily]: 'Oily skin',
      [SkinType.Dry]: 'Dry skin',
      [SkinType.Combination]: 'Combination skin',
      [SkinType.Sensitive]: 'Sensitive skin',
    };
    return map[skinType] ?? 'Normal skin';
  }

  private mapLabelToSkinType(label: string): SkinType {
    const map: Record<string, SkinType> = {
      'Normal skin': SkinType.Normal,
      'Oily skin': SkinType.Oily,
      'Dry skin': SkinType.Dry,
      'Combination skin': SkinType.Combination,
      'Sensitive skin': SkinType.Sensitive,
    };
    return map[label] ?? SkinType.Normal;
  }
}
