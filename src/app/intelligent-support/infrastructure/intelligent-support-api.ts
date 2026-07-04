import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupportQuery } from '../domain/model/support-query.entity';
import { ChatMessage } from '../domain/model/chat-message.entity';
import { SupportQueryResource } from './support-query.response';
import { ChatMessageResource } from './chat-message.response';
import { SupportQueryAssembler } from './support-query.assembler';
import { ChatMessageAssembler } from './chat-message.assembler';

/**
 * Infrastructure facade for intelligent support endpoint operations.
 * Calls the real Spring Boot backend for all intelligent support features.
 */
@Injectable({ providedIn: 'root' })
export class IntelligentSupportApi {
  private readonly supportQueriesUrl = `${environment.backendBasePath}${environment.backendSupportQueriesEndpointPath}`;
  private readonly chatMessagesUrl = `${environment.backendBasePath}${environment.backendChatMessagesEndpointPath}`;

  private readonly supportQueryAssembler = new SupportQueryAssembler();
  private readonly chatMessageAssembler = new ChatMessageAssembler();

  constructor(private readonly http: HttpClient) {}

  /**
   * Creates a new support query session for a patient.
   * @param supportQuery - The support query entity with patientId and skinProfileId.
   * @returns Stream with the created SupportQuery entity.
   */
  createSupportQuery(supportQuery: SupportQuery): Observable<SupportQuery> {
    return this.http
      .post<SupportQueryResource>(this.supportQueriesUrl, {
        patientId: supportQuery.userId,
        skinProfileId: supportQuery.skinProfileId,
      })
      .pipe(map((r) => this.supportQueryAssembler.toEntityFromResource(r)));
  }

  /**
   * Retrieves a single support query by its identifier.
   * @param id - The identifier of the support query.
   * @returns Stream with the matched SupportQuery entity.
   */
  getSupportQuery(id: number): Observable<SupportQuery> {
    return this.http
      .get<SupportQueryResource>(`${this.supportQueriesUrl}/${id}`)
      .pipe(map((r) => this.supportQueryAssembler.toEntityFromResource(r)));
  }

  /**
   * Retrieves the active IN_PROGRESS support query for a patient.
   * Returns 404 if there is no active session.
   * @param patientId - The IAM user id of the patient.
   * @returns Stream with the active SupportQuery entity.
   */
  getActiveQuery(patientId: number): Observable<SupportQuery> {
    return this.http
      .get<SupportQueryResource>(`${this.supportQueriesUrl}/patient/${patientId}/active`)
      .pipe(map((r) => this.supportQueryAssembler.toEntityFromResource(r)));
  }

  /**
   * Updates the status of an existing support query.
   * @param supportQuery - The support query entity with the updated status.
   * @returns Stream with the updated SupportQuery entity.
   */
  updateSupportQuery(supportQuery: SupportQuery): Observable<SupportQuery> {
    return this.http
      .put<SupportQueryResource>(`${this.supportQueriesUrl}/${supportQuery.id}`, {
        status: supportQuery.status,
      })
      .pipe(map((r) => this.supportQueryAssembler.toEntityFromResource(r)));
  }

  /**
   * Retrieves all chat messages belonging to a support query session.
   * @param supportQueryId - The identifier of the parent support query.
   * @returns Stream with the list of ChatMessage entities.
   */
  getChatMessages(supportQueryId: number): Observable<ChatMessage[]> {
    return this.http
      .get<ChatMessageResource[]>(`${this.chatMessagesUrl}/support-query/${supportQueryId}`)
      .pipe(
        map((resources) => resources.map((r) => this.chatMessageAssembler.toEntityFromResource(r))),
      );
  }

  /**
   * Sends a user message and receives the AI-generated response.
   * The backend saves both the user message and the AI response,
   * and returns the AI response.
   * @param chatMessage - The user chat message entity to send.
   * @returns Stream with the AI-generated ChatMessage response.
   */
  sendChatMessage(chatMessage: ChatMessage): Observable<ChatMessage> {
    return this.http
      .post<ChatMessageResource>(this.chatMessagesUrl, {
        supportQueryId: chatMessage.supportQueryId,
        text: chatMessage.text,
      })
      .pipe(map((r) => this.chatMessageAssembler.toEntityFromResource(r)));
  }
}
