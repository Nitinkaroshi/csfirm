import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CaseService } from './case.service';
import { CaseController } from './case.controller';
import { CaseRepository } from './case.repository';
import { CaseStateMachine } from './state-machine/case-state-machine';
import { TransitionExecutor } from './transition-executor';
import { AssignmentService } from './assignment.service';
import { TransferService } from './transfer.service';
import { CaseEventListener } from './listeners/case-event.listener';
import { BulkOperationsService } from './bulk-operations.service';
import { QUEUE_NAMES } from '../../common/constants/queues.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATION })],
  providers: [
    CaseService,
    CaseRepository,
    CaseStateMachine,
    TransitionExecutor,
    AssignmentService,
    TransferService,
    CaseEventListener,
    BulkOperationsService,
  ],
  controllers: [CaseController],
  exports: [CaseService, CaseRepository],
})
export class CaseModule {}
