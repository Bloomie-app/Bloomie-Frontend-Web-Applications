import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { IntelligentSupportStore } from '../../../application/intelligent-support.store';
import { IamStore } from '../../../../iam/application/iam.store';
import { SkinAnalysisStore } from '../../../../skin-analysis/application/skin-analysis.store';

@Component({
  selector: 'app-ai-chat',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './ai-chat.html',
  styleUrl: './ai-chat.css',
})
export class AiChat implements OnInit {
  readonly store = inject(IntelligentSupportStore);
  readonly iamStore = inject(IamStore);
  readonly skinAnalysisStore = inject(SkinAnalysisStore);
  protected router = inject(Router);
  readonly inputText = signal<string>('');

  ngOnInit(): void {
    const currentUser = this.iamStore.currentUser();
    if (!currentUser) {
      this.router.navigate(['/iam/sign-in-home']);
      return;
    }

    const skinProfileId = this.skinAnalysisStore.skinProfile()?.id ?? 1;
    this.store.initializeChat(currentUser.id, skinProfileId);
  }

  onSendMessage(): void {
    const text = this.inputText().trim();
    const currentQuery = this.store.currentQuery();
    if (!text || !currentQuery) return;
    this.store.sendMessage(text, currentQuery.id);
    this.inputText.set('');
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSendMessage();
    }
  }

  onDismissLimitationBanner(): void {
    this.store.dismissLimitationBanner();
  }

  onNavigateToDermatologist(): void {
    this.router.navigate(['/dermatology/select-doctor']);
  }

  onNavigateBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
