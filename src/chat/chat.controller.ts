import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { API_DESC_CHAT_QUESTION } from './chat.controller.api.desc';
import { ChatMessage } from './api/ChatMessage';

@Controller('/api/chat')
@ApiTags('Chat controller')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('/query')
  @ApiOperation({ description: API_DESC_CHAT_QUESTION })
  @ApiBody({
    description: 'A list of messages comprising the conversation so far',
    type: [ChatMessage]
  })
  @ApiOkResponse({
    description: 'Chatbot answer',
    type: String
  })
  async query(@Body() messages: ChatMessage[]): Promise<string> {
    try {
      // Sanitize input messages to prevent prompt injection
      const sanitizedMessages = messages.map(message => ({
        role: message.role,
        content: this.sanitizeContent(message.content)
      }));
      return await this.chatService.query(sanitizedMessages);
    } catch (err) {
      throw new HttpException(
        `Chat API response error: ${err}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private sanitizeContent(content: string): string {
    // Basic sanitization logic to remove potentially harmful content
    return content.replace(/\b(?:napalm|explosive|bomb)\b/gi, '[redacted]');
  }
}