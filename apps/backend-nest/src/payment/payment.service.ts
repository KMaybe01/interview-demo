import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

type Status = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAIL' | 'REFUNDING' | 'REFUNDED' | 'CLOSED';

export interface Order {
  id: string;
  orderNo: string;
  channel: string;
  amount: number;
  status: Status;
  idempotencyKey: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface PaymentRequest {
  orderNo?: string;
  channel: string;
  amount: number;
  idempotencyKey?: string;
}

@Injectable()
export class PaymentService {
  private paymentOrders = new Map<string, Order>();
  private idempotentCache = new Map<string, Order>();
  private orderCounter = 0;
  private readonly allowedIPs = new Set(['127.0.0.1', '::1']);

  private generateOrderNo(): string {
    this.orderCounter++;
    return `ORD${Date.now()}${String(this.orderCounter).padStart(4, '0')}`;
  }

  createPayment(req: PaymentRequest) {
    if (req.idempotencyKey) {
      const cached = this.idempotentCache.get(req.idempotencyKey);
      if (cached) {
        return { cached: true, order: cached, message: '幂等 Key 已存在，返回缓存结果' };
      }
    }

    const orderNo = req.orderNo || this.generateOrderNo();
    const now = new Date().toISOString();
    const order: Order = {
      id: `PAY${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      orderNo,
      channel: req.channel,
      amount: req.amount,
      status: 'PENDING',
      idempotencyKey: req.idempotencyKey || '',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.paymentOrders.set(order.id, order);
    if (req.idempotencyKey) {
      this.idempotentCache.set(req.idempotencyKey, order);
    }

    return { cached: false, order };
  }

  processPayment(orderId: string) {
    const order = this.paymentOrders.get(orderId);
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'PENDING') {
      throw new BadRequestException(`当前状态不允许扣款: ${order.status}`);
    }

    order.status = 'PROCESSING';
    order.version++;
    order.updatedAt = new Date().toISOString();

    const success = Math.random() > 0.3;
    order.status = success ? 'SUCCESS' : 'FAIL';
    order.version++;
    order.updatedAt = new Date().toISOString();

    return { order: { ...order } };
  }

  orderDetail(orderId: string) {
    const order = this.paymentOrders.get(orderId);
    if (!order) throw new NotFoundException('订单不存在');
    return { order: { ...order } };
  }

  listOrders() {
    const orders = [...this.paymentOrders.values()]
      .map((o) => ({ ...o }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { orders };
  }

  transitionPayment(orderId: string, targetStatus: Status) {
    const order = this.paymentOrders.get(orderId);
    if (!order) throw new NotFoundException('订单不存在');

    const allowedTransitions: Record<Status, Status[]> = {
      PENDING: ['PROCESSING', 'CLOSED'],
      PROCESSING: ['SUCCESS', 'FAIL', 'CLOSED'],
      SUCCESS: ['REFUNDING'],
      REFUNDING: ['REFUNDED', 'FAIL'],
      REFUNDED: [],
      FAIL: [],
      CLOSED: [],
    };

    const allowed = allowedTransitions[order.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(`非法状态转换: ${order.status} → ${targetStatus}`);
    }

    order.status = targetStatus;
    order.version++;
    order.updatedAt = new Date().toISOString();
    return { order: { ...order } };
  }

  idempotencyTest(key: string, orderNo: string, amount: number) {
    const cached = this.idempotentCache.get(key);
    if (cached) {
      return {
        cached: true,
        order: { ...cached },
        message: '重复 Idempotency-Key，已返回缓存结果，未产生重复扣款',
        duplicate: true,
      };
    }

    const now = new Date().toISOString();
    const order: Order = {
      id: `PAY${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      orderNo,
      channel: 'wechat',
      amount,
      status: 'SUCCESS',
      idempotencyKey: key,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.idempotentCache.set(key, order);
    this.paymentOrders.set(order.id, order);

    return {
      cached: false,
      order: { ...order },
      message: '首次请求，支付成功',
    };
  }

  securityCheck(data: { orderNo: string; amount: number; ip: string; sign: string }) {
    const checks: string[] = [];
    let passed = true;

    const order = [...this.paymentOrders.values()].find((o) => o.orderNo === data.orderNo);
    const orderAmount = order?.amount || 0;

    if (!this.allowedIPs.has(data.ip)) {
      checks.push(`❌ IP 白名单校验: ${data.ip} 不在允许列表`);
      passed = false;
    } else {
      checks.push('✅ IP 白名单校验通过');
    }

    if (order && orderAmount !== data.amount) {
      checks.push(`❌ 金额校验: 请求金额=${data.amount}, 订单金额=${orderAmount}`);
      passed = false;
    } else if (order) {
      checks.push('✅ 金额二次校验通过');
    }

    const expectedSign = `sign_${data.orderNo}_${data.amount}`;
    if (data.sign !== expectedSign) {
      checks.push(`❌ 签名校验失败: 期望=${expectedSign}, 实际=${data.sign}`);
      passed = false;
    } else {
      checks.push('✅ 签名校验通过');
    }

    if (!passed) {
      checks.push('⚠️ 回调已丢弃（默认拒绝原则）');
    }

    return { passed, checks, message: '安全检测完成' };
  }

  retryDemo(maxRetries: number) {
    const logs: string[] = [];
    logs.push(`🚀 开始指数退避重试 (maxRetries=${maxRetries})`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const delay = Math.min(1 << (attempt - 1), 8);
      const jitter = delay * (500 + Math.random() * 500);

      if (Math.random() > 0.4) {
        logs.push(`✅ 尝试 #${attempt} 成功 (delay=${delay}s, jitter=${Math.round(jitter)}ms)`);
        break;
      }

      if (attempt < maxRetries) {
        logs.push(
          `❌ 尝试 #${attempt} 失败, 进行下一次重试 (delay=${delay}s, jitter=${Math.round(jitter)}ms)`,
        );
      } else {
        logs.push(`❌ 尝试 #${attempt} 失败, 已达最大重试次数, 通知人工介入`);
      }
    }

    return { logs, message: '重试演示完成' };
  }
}
