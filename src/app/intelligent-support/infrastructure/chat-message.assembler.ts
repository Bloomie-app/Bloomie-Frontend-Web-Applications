import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { ChatMessage, MessageType } from '../domain/model/chat-message.entity';
import { ChatMessageResource, ChatMessagesResponse } from './chat-message.response';

/**
 * Maps ChatMessage entities to and from API resources.
 */
export class ChatMessageAssembler implements BaseAssembler<
  ChatMessage,
  ChatMessageResource,
  ChatMessagesResponse
> {
  /**
   * Converts a ChatMessagesResponse to an array of ChatMessage entities.
   * @param response - The API response containing chat messages.
   * @returns An array of ChatMessage entities.
   */
  toEntitiesFromResponse(response: ChatMessagesResponse): ChatMessage[] {
    return response.chat_messages.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: ChatMessageResource): ChatMessage {
    return new ChatMessage({
      id: resource.id,
      supportQueryId: resource.supportQueryId,
      text: resource.text,
      type: resource.messageType as MessageType,
      sentAt: resource.sentAt,
    });
  }

  toResourceFromEntity(entity: ChatMessage): ChatMessageResource {
    return {
      id: entity.id,
      supportQueryId: entity.supportQueryId,
      text: entity.text,
      messageType: entity.type,
      sentAt: entity.sentAt,
    } as ChatMessageResource;
  }
}
