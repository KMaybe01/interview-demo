import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';

@ApiTags('支付')
@ApiSecurity('Bearer')
@UseGuards(JwtAuthGuard)
@Controller('api/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  @ApiOperation({ summary: '创建支付订单' })
  createPayment(@Body() body: any) {
    return this.paymentService.createPayment(body);
  }

  @Post('process/:id')
  @ApiOperation({ summary: '处理支付扣款' })
  processPayment(@Param('id') id: string) {
    return this.paymentService.processPayment(id);
  }

  @Get('order/:id')
  @ApiOperation({ summary: '查询订单' })
  orderDetail(@Param('id') id: string) {
    return this.paymentService.orderDetail(id);
  }

  @Get('orders')
  @ApiOperation({ summary: '订单列表' })
  listOrders() {
    return this.paymentService.listOrders();
  }

  @Post('transition/:id')
  @ApiOperation({ summary: '订单状态转换' })
  transitionPayment(@Param('id') id: string, @Body() body: any) {
    return this.paymentService.transitionPayment(id, body.status);
  }

  @Post('idempotency-test')
  @ApiOperation({ summary: '幂等性测试' })
  idempotencyTest(@Body() body: any) {
    return this.paymentService.idempotencyTest(body.key, body.orderNo, body.amount);
  }

  @Post('security-check')
  @ApiOperation({ summary: '安全校验' })
  securityCheck(@Body() body: any) {
    return this.paymentService.securityCheck(body);
  }

  @Post('retry-demo')
  @ApiOperation({ summary: '重试演示' })
  retryDemo(@Body() body: any) {
    return this.paymentService.retryDemo(body.maxRetries || 3);
  }
}
