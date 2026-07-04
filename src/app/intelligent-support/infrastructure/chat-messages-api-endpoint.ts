import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { ChatMessage } from '../domain/model/chat-message.entity';
import { ChatMessageResource, ChatMessagesResponse } from './chat-message.response';
import { ChatMessageAssembler } from './chat-message.assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Endpoint client for chat message CRUD operations.
 */
export class ChatMessagesApiEndpoint extends BaseApiEndpoint<
  ChatMessage,
  ChatMessageResource,
  ChatMessagesResponse,
  ChatMessageAssembler
> {
  /**
   * Creates an instance of ChatMessagesApiEndpoint.
   * @param http - The HttpClient to be used for making API requests.
   */
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.backendBasePath}${environment.backendChatMessagesEndpointPath}`,
      new ChatMessageAssembler(),
    );
  }
}
