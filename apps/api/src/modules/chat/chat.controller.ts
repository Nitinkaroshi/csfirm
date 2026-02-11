import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { RoomAccessGuard } from './room-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('cases/:caseId/rooms')
  @ApiOperation({ summary: 'Get chat rooms for a case' })
  async getRooms(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user: { userId: string; type: string },
  ) {
    return this.chatService.getRoomsForCase(caseId, user.userId, user.type === 'STAFF');
  }

  @Get('rooms/:roomId/messages')
  @UseGuards(RoomAccessGuard)
  @ApiOperation({ summary: 'Get messages for a room (paginated)' })
  async getMessages(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getMessages(roomId, cursor, limit);
  }

  @Post('rooms/:roomId/messages')
  @UseGuards(RoomAccessGuard)
  @ApiOperation({ summary: 'Send message via REST (prefer WebSocket)' })
  async sendMessage(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { content: string },
  ) {
    return this.chatService.sendMessage({ roomId, senderId: userId, content: body.content });
  }
}
