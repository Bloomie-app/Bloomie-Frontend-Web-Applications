import { computed, DestroyRef, inject, Injectable, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { retry, take } from 'rxjs';
import {
  SupportQuery,
  SupportQueryStatus,
  SuggestedAction,
} from '../domain/model/support-query.entity';
import { ChatMessage, MessageType } from '../domain/model/chat-message.entity';
import { IntelligentSupportApi } from '../infrastructure/intelligent-support-api';

/**
 * Holds intelligent support application state and coordinates
 * support query and chat message application layer behavior.
 */
@Injectable({ providedIn: 'root' })
export class IntelligentSupportStore {
  private readonly currentQuerySignal = signal<SupportQuery | null>(null);
  private readonly messagesSignal = signal<ChatMessage[]>([]);
  private readonly showLimitationBannerSignal = signal<boolean>(false);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  /**
   * Readonly signal for the currently active support query session.
   */
  readonly currentQuery = this.currentQuerySignal.asReadonly();

  /**
   * Readonly signal for the list of chat messages in the current session.
   */
  readonly messages = this.messagesSignal.asReadonly();

  /**
   * Readonly signal that controls the visibility of the AI limitation banner.
   * The banner is shown when the AI detects a query that requires
   * professional dermatological evaluation.
   */
  readonly showLimitationBanner = this.showLimitationBannerSignal.asReadonly();

  /**
   * Readonly signal indicating if a network operation is in progress.
   */
  readonly loading = this.loadingSignal.asReadonly();

  /**
   * Readonly signal for the current error message, or null if there is none.
   */
  readonly error = this.errorSignal.asReadonly();

  /**
   * Computed signal for the total number of messages in the current session.
   */
  readonly messageCount = computed(() => this.messages().length);

  /**
   * Computed signal that returns true if the current query's suggested action
   * recommends booking a professional dermatology consultation.
   */
  readonly requiresDermatologyConsultation = computed(
    () => this.currentQuery()?.requiresDermatologyConsultation ?? false,
  );

  /**
   * Computed signal for the list of messages authored by the user.
   */
  readonly userMessages = computed(() =>
    this.messages().filter((message) => message.isUserMessage),
  );

  private readonly destroyRef = inject(DestroyRef);

  /**
   * Creates an instance of IntelligentSupportStore.
   * @param intelligentSupportApi - The API service for intelligent support data.
   */
  constructor(private intelligentSupportApi: IntelligentSupportApi) {}

  /**
   * Loads an existing support query and its messages by identifier.
   * @param queryId - The identifier of the support query to load.
   */
  loadQuery(queryId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.intelligentSupportApi
      .getSupportQuery(queryId)
      .pipe(take(1))
      .subscribe({
        next: (supportQuery) => {
          this.currentQuerySignal.set(supportQuery);
          this.loadingSignal.set(false);
          this.loadMessages(queryId);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load support query'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Creates a new support query session for a given user and skin profile,
   * then loads its initial messages.
   * @param supportQuery - The support query entity to create.
   */
  startQuery(supportQuery: SupportQuery): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.messagesSignal.set([]);
    this.showLimitationBannerSignal.set(false);
    this.intelligentSupportApi
      .createSupportQuery(supportQuery)
      .pipe(retry(2))
      .subscribe({
        next: (createdQuery) => {
          this.currentQuerySignal.set(createdQuery);
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to start support query'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Sends a user message within the current support query session.
   * Builds the ChatMessage entity and persists it via the API.
   * If the text contains keywords that exceed the AI's scope,
   * the limitation banner is shown and the suggested action is updated.
   * @param text - The message text typed by the user.
   * @param supportQueryId - The identifier of the active support query.
   */
  sendMessage(text: string, supportQueryId: number): void {
    if (!text.trim()) return;

    const userMessage = new ChatMessage({
      id: 0,
      supportQueryId: supportQueryId,
      text: text.trim(),
      type: MessageType.User,
      sentAt: new Date().toISOString(),
    });
    this.messagesSignal.update((messages) => [...messages, userMessage]);

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.intelligentSupportApi
      .sendChatMessage(userMessage)
      .pipe(retry(2))
      .subscribe({
        next: (aiMessage) => {
          this.messagesSignal.update((messages) => [...messages, aiMessage]);
          this.loadingSignal.set(false);
          this.evaluateLimitation(text);
        },
        error: (err) => {
          this.messagesSignal.update((messages) => messages.filter((m) => m !== userMessage));
          this.errorSignal.set(this.formatError(err, 'Failed to send message'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Marks the current support query as resolved and updates it via the API.
   */
  markAsResolved(): void {
    const currentQuery = this.currentQuerySignal();
    if (!currentQuery) return;

    currentQuery.status = SupportQueryStatus.Resolved;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.intelligentSupportApi
      .updateSupportQuery(currentQuery)
      .pipe(retry(2))
      .subscribe({
        next: (updatedQuery) => {
          this.currentQuerySignal.set(updatedQuery);
          this.loadingSignal.set(false);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to resolve support query'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Dismisses the AI limitation banner.
   */
  dismissLimitationBanner(): void {
    this.showLimitationBannerSignal.set(false);
  }

  /**
   * Loads all chat messages belonging to a given support query.
   * @param supportQueryId - The identifier of the parent support query.
   */
  private loadMessages(supportQueryId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.intelligentSupportApi
      .getChatMessages(supportQueryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chatMessages) => {
          this.messagesSignal.set(
            chatMessages.filter((message) => message.supportQueryId === supportQueryId),
          );
          this.loadingSignal.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to load messages'));
          this.loadingSignal.set(false);
        },
      });
  }

  /**
   * Evaluates whether the user's message text exceeds the AI's scope.
   * If limitation keywords are detected, shows the limitation banner
   * and updates the suggested action to recommend a dermatology consultation.
   * @param text - The message text to evaluate.
   */
  private evaluateLimitation(text: string): void {
    const limitationKeywords = [
      'diagnos',
      'disease',
      'infection',
      'condition',
      'prescri',
      'medical',
      'rash',
      'lesion',
      'treatment',
      'medication',
      'symptom',
      'cure',
      'fungal',
      'eczema',
      'psoriasis',
      'cancer',
      'tumor',
    ];

    const lowerText = text.toLowerCase();
    const isLimited = limitationKeywords.some((keyword) => lowerText.includes(keyword));

    if (isLimited) {
      this.showLimitationBannerSignal.set(true);
      this.updateSuggestedAction(SuggestedAction.SuggestDermatologyConsultation);
    }
  }

  /**
   * Updates the suggested action of the current query and persists the change.
   * @param suggestedAction - The new suggested action to set.
   */
  private updateSuggestedAction(suggestedAction: SuggestedAction): void {
    const currentQuery = this.currentQuerySignal();
    if (!currentQuery) return;

    currentQuery.suggestedAction = suggestedAction;
    this.intelligentSupportApi
      .updateSupportQuery(currentQuery)
      .pipe(retry(2))
      .subscribe({
        next: (updatedQuery) => {
          this.currentQuerySignal.set(updatedQuery);
        },
        error: (err) => {
          this.errorSignal.set(this.formatError(err, 'Failed to update suggested action'));
        },
      });
  }

  /**
   * Normalizes unknown errors into a display-friendly message.
   * @param error - Source error.
   * @param fallback - Default message when details are unavailable.
   * @returns Normalized message.
   */
  private formatError(error: any, fallback: string): string {
    if (error instanceof Error) {
      return error.message.includes('Resource not found')
        ? `${fallback}: Not found`
        : error.message;
    }
    return fallback;
  }

  initializeChat(patientId: number, skinProfileId: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.intelligentSupportApi.getActiveQuery(patientId).subscribe({
      next: (activeQuery) => {
        this.currentQuerySignal.set(activeQuery);
        this.loadMessages(activeQuery.id);
      },
      error: () => {
        this.startQuery(
          new SupportQuery({
            id: 0,
            userId: patientId,
            skinProfileId: skinProfileId,
            lastFacialScanId: 0,
            suggestedAction: SuggestedAction.ContinueRoutine,
            status: SupportQueryStatus.InProgress,
            createdAt: new Date().toISOString(),
          }),
        );
      },
    });
  }
}
