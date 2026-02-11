import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { RoomAccessGuard } from './room-access.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [ChatService, ChatGateway, RoomAccessGuard],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
