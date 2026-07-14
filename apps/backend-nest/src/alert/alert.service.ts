import { Injectable } from '@nestjs/common';

interface AlertMessage {
  id: string;
  seq: number;
  topic: string;
  category: string;
  level: string;
  message: string;
  time: string;
}

interface MsgTemplate {
  category: string;
  template: string;
  argTypes: string[];
}

@Injectable()
export class AlertService {
  private seqCounter = 0;

  private readonly topics = ['alert', 'status', 'log'];

  private readonly alertTemplates: MsgTemplate[] = [
    { category: 'system', template: 'CPU 使用率 %f%% (阈值 90%%)', argTypes: ['f'] },
    { category: 'system', template: '内存使用率 %f%% (阈值 85%%)', argTypes: ['f'] },
    { category: 'system', template: '磁盘空间剩余 %fGB (阈值 10GB)', argTypes: ['f'] },
    { category: 'system', template: '系统负载 %f (核心数 %d)', argTypes: ['f', 'd'] },
    { category: 'network', template: '网络延迟 %fms (阈值 50ms)', argTypes: ['f'] },
    { category: 'network', template: '丢包率 %f%% (阈值 1%%)', argTypes: ['f'] },
    { category: 'network', template: '带宽使用率 %f%% (阈值 80%%)', argTypes: ['f'] },
    { category: 'database', template: '数据库连接池使用率 %f%%', argTypes: ['f'] },
    { category: 'database', template: '慢查询 %d 条超过 1s', argTypes: ['d'] },
    { category: 'security', template: '异常登录尝试 %d 次/分钟', argTypes: ['d'] },
    { category: 'security', template: 'SSL 证书 %f 天后过期', argTypes: ['f'] },
    { category: 'application', template: 'API p99 响应时间 %fms (阈值 500ms)', argTypes: ['f'] },
    { category: 'application', template: '任务队列积压 %d 条', argTypes: ['d'] },
    { category: 'application', template: '缓存命中率 %f%% (阈值 90%%)', argTypes: ['f'] },
  ];

  private readonly statusTemplates: MsgTemplate[] = [
    { category: 'system', template: '节点 10.0.1.%d 存活检查通过', argTypes: ['d'] },
    { category: 'system', template: '系统时延 %fms', argTypes: ['f'] },
    { category: 'network', template: 'API 网关 QPS %d', argTypes: ['d'] },
    { category: 'database', template: '数据库主从同步延迟 %fms', argTypes: ['f'] },
    { category: 'database', template: '缓存集群内存使用率 %f%%', argTypes: ['f'] },
  ];

  private readonly logTemplates: MsgTemplate[] = [
    { category: 'application', template: 'GET /api/users 200 %fms', argTypes: ['f'] },
    { category: 'application', template: 'POST /api/orders 201 %fms', argTypes: ['f'] },
    { category: 'application', template: 'GET /api/dashboard 200 %fms', argTypes: ['f'] },
    {
      category: 'application',
      template: 'ERROR: connection refused to 10.0.1.%d:3306',
      argTypes: ['d'],
    },
    { category: 'application', template: 'WARN: disk usage %f%% on /data', argTypes: ['f'] },
    { category: 'application', template: 'INFO: scheduled job completed in %fms', argTypes: ['f'] },
  ];

  private fillTemplate(tmpl: MsgTemplate): [string, string] {
    const args = tmpl.argTypes.map((t) => {
      switch (t) {
        case 'd':
          return Math.floor(Math.random() * 1000);
        case 'f':
          return parseFloat((Math.random() * 100).toFixed(2));
        default:
          return '';
      }
    });

    let msg = tmpl.template;
    for (const arg of args) {
      msg = msg.replace(/%[df]/, String(arg));
    }
    return [tmpl.category, msg];
  }

  randomMessage(topic: string): AlertMessage {
    const templates =
      topic === 'status'
        ? this.statusTemplates
        : topic === 'log'
          ? this.logTemplates
          : this.alertTemplates;

    const tmpl = templates[Math.floor(Math.random() * templates.length)];
    const [category, msg] = this.fillTemplate(tmpl);

    const levelWeights: Record<string, { level: string; weight: number }[]> = {
      alert: [
        { level: 'critical', weight: 20 },
        { level: 'major', weight: 30 },
        { level: 'minor', weight: 30 },
        { level: 'info', weight: 20 },
      ],
      status: [
        { level: 'critical', weight: 8 },
        { level: 'major', weight: 12 },
        { level: 'minor', weight: 30 },
        { level: 'info', weight: 50 },
      ],
      log: [
        { level: 'critical', weight: 5 },
        { level: 'major', weight: 15 },
        { level: 'minor', weight: 35 },
        { level: 'info', weight: 45 },
      ],
    };

    const weights = levelWeights[topic] || levelWeights.alert;
    const total = weights.reduce((s, w) => s + w.weight, 0);
    let r = Math.random() * total;
    const level =
      weights.find((w) => {
        r -= w.weight;
        return r <= 0;
      })?.level || 'info';

    this.seqCounter++;
    return {
      id: `alert-${Date.now()}-${this.seqCounter}`,
      seq: this.seqCounter,
      topic,
      category,
      level,
      message: msg,
      time: new Date().toISOString().slice(11, 23),
    };
  }

  generateAlertBatch(count: number): AlertMessage[] {
    return Array.from({ length: count }, () => {
      const topic = this.topics[Math.floor(Math.random() * this.topics.length)];
      return this.randomMessage(topic);
    });
  }
}
