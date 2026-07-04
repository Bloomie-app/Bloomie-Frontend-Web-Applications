import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface ChatMessageResource extends BaseResource {
  id: number;
  supportQueryId: number;
  text: string;
  messageType: string;
  sentAt: string;
}

export interface ChatMessagesResponse extends BaseResponse {
  chat_messages: ChatMessageResource[];
}
