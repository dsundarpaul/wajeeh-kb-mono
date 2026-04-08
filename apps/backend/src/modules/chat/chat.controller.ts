import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChatService } from './chat.service';

export class ChatMessageDto {
  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty()
  @IsString()
  content: string;
}

export class ChatRequestDto {
  @ApiProperty()
  @IsString()
  query: string;

  @ApiProperty({ type: [ChatMessageDto], default: [] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  chat_history: ChatMessageDto[];
}

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send a chat message and get a RAG-based response' })
  async chat(@Body() payload: ChatRequestDto) {
    return this.chatService.answerQuery(payload.query, payload.chat_history);
  }
}
