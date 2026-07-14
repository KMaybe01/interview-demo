import * as net from 'node:net';
import { Injectable } from '@nestjs/common';

export interface ValidationError {
  path: string;
  message: string;
  source: string;
}

@Injectable()
export class SchemaService {
  getSchemaConfig() {
    return {
      schema: {
        type: 'tabs',
        key: 'root',
        tabs: [
          {
            title: '基站配置',
            key: 'cell',
            children: [
              {
                type: 'card',
                key: 'basic',
                title: '基本信息',
                description: '基站核心参数',
                children: [
                  {
                    type: 'leaf',
                    key: 'basic-fields',
                    properties: {
                      cellName: {
                        type: 'string',
                        key: 'cellName',
                        title: '基站名称',
                        required: true,
                        placeholder: '例如: SMF-01',
                        minLength: 2,
                        maxLength: 32,
                      },
                      fullCellName: {
                        type: 'string',
                        key: 'fullCellName',
                        title: '完整基站名称',
                        description: '自动生成',
                        placeholder: '由基站类型和名称自动拼接',
                        dependencies: ['cellName', 'cellType'],
                      },
                      cellId: {
                        type: 'string',
                        key: 'cellId',
                        title: '基站 ID',
                        required: true,
                        placeholder: '例如: CELL-001',
                      },
                      cellType: {
                        type: 'select',
                        key: 'cellType',
                        title: '基站类型',
                        required: true,
                        options: [
                          { label: '宏基站 (Macro)', value: 'macro' },
                          { label: '微基站 (Micro)', value: 'micro' },
                          { label: '皮基站 (Pico)', value: 'pico' },
                          { label: '家庭基站 (Femto)', value: 'femto' },
                        ],
                        placeholder: '选择基站类型',
                      },
                      status: {
                        type: 'select',
                        key: 'status',
                        title: '运行状态',
                        options: [
                          { label: '在线', value: 'online' },
                          { label: '离线', value: 'offline' },
                          { label: '维护', value: 'maintenance' },
                        ],
                        placeholder: '选择状态',
                      },
                    },
                  },
                ],
              },
              {
                type: 'card',
                key: 'network',
                title: '网络配置',
                description: 'IP 与传输参数',
                children: [
                  {
                    type: 'leaf',
                    key: 'network-fields',
                    properties: {
                      ipAddress: {
                        type: 'string',
                        key: 'ipAddress',
                        title: '管理 IP',
                        required: true,
                        placeholder: '例如: 192.168.1.100',
                      },
                      port: {
                        type: 'number',
                        key: 'port',
                        title: '端口号',
                        required: true,
                        min: 1024,
                        max: 65535,
                        placeholder: '例如: 8080',
                      },
                      mcc: {
                        type: 'string',
                        key: 'mcc',
                        title: 'MCC (移动国家码)',
                        minLength: 3,
                        maxLength: 3,
                        placeholder: '例如: 460',
                      },
                      mnc: {
                        type: 'string',
                        key: 'mnc',
                        title: 'MNC (移动网络码)',
                        minLength: 2,
                        maxLength: 3,
                        placeholder: '例如: 01',
                      },
                      tac: {
                        type: 'number',
                        key: 'tac',
                        title: 'TAC (跟踪区码)',
                        min: 1,
                        max: 65535,
                        placeholder: '例如: 1',
                      },
                    },
                  },
                ],
              },
            ],
          },
          {
            title: '传输配置',
            key: 'transport',
            children: [
              {
                type: 'card',
                key: 'sctp-config',
                title: 'SCTP 传输配置',
                description: 'SCTP 端口列表',
                children: [
                  {
                    type: 'leaf',
                    key: 'sctp-fields',
                    properties: {
                      sctpPorts: {
                        type: 'array',
                        key: 'sctpPorts',
                        title: 'SCTP 端口',
                        description: '添加/删除 SCTP 端口对',
                        required: true,
                        minItems: 1,
                        maxItems: 10,
                        items: {
                          type: 'leaf',
                          key: 'sctp-port-item',
                          properties: {
                            localPort: {
                              type: 'number',
                              key: 'localPort',
                              title: '本地端口',
                              required: true,
                              min: 1,
                              max: 65535,
                              placeholder: '例如: 38472',
                            },
                            remotePort: {
                              type: 'number',
                              key: 'remotePort',
                              title: '远端端口',
                              required: true,
                              min: 1,
                              max: 65535,
                              placeholder: '例如: 38472',
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
          {
            title: '业务参数',
            key: 'service',
            children: [
              {
                type: 'card',
                key: 'service-config',
                title: '业务配置',
                children: [
                  {
                    type: 'leaf',
                    key: 'service-fields',
                    properties: {
                      maxUsers: {
                        type: 'number',
                        key: 'maxUsers',
                        title: '最大用户数',
                        required: true,
                        min: 1,
                        max: 100000,
                        placeholder: '例如: 10000',
                      },
                      bandwidth: {
                        type: 'select',
                        key: 'bandwidth',
                        title: '带宽 (MHz)',
                        required: true,
                        options: [
                          { label: '5 MHz', value: 5 },
                          { label: '10 MHz', value: 10 },
                          { label: '20 MHz', value: 20 },
                          { label: '40 MHz', value: 40 },
                          { label: '100 MHz', value: 100 },
                        ],
                      },
                      enableEncryption: {
                        type: 'switch',
                        key: 'enableEncryption',
                        title: '启用加密',
                        default: true,
                      },
                      enableLogging: {
                        type: 'switch',
                        key: 'enableLogging',
                        title: '启用日志',
                        default: false,
                      },
                    },
                  },
                ],
              },
              {
                type: 'card',
                key: 'advanced',
                title: '高级配置',
                children: [
                  {
                    type: 'leaf',
                    key: 'advanced-fields',
                    properties: {
                      encryptAlgorithm: {
                        type: 'select',
                        key: 'encryptAlgorithm',
                        title: '加密算法',
                        options: [
                          { label: 'AES-256', value: 'aes-256' },
                          { label: 'AES-128', value: 'aes-128' },
                          { label: 'SM4', value: 'sm4' },
                        ],
                        placeholder: '选择加密算法',
                        default: 'aes-256',
                        visible: 'enableEncryption === true',
                      },
                      certType: {
                        type: 'select',
                        key: 'certType',
                        title: '证书类型',
                        options: [
                          { label: '自签名', value: 'self-signed' },
                          { label: 'CA 签发', value: 'ca-signed' },
                        ],
                        placeholder: '选择证书类型',
                        default: 'self-signed',
                        visible: 'enableEncryption === true',
                      },
                      certPath: {
                        type: 'string',
                        key: 'certPath',
                        title: '证书路径',
                        placeholder: '例如: /etc/certs/server.pem',
                        visible: 'enableEncryption === true && certType === "ca-signed"',
                      },
                      deployTime: { type: 'datetime', key: 'deployTime', title: '部署时间' },
                      extraConfig: {
                        type: 'json',
                        key: 'extraConfig',
                        title: '扩展配置',
                        description: 'JSON 格式自定义参数',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      initialData: {
        cellName: 'SMF-01',
        cellId: 'CELL-001',
        cellType: 'macro',
        status: 'online',
        ipAddress: '192.168.1.100',
        port: 8080,
        mcc: '460',
        mnc: '01',
        tac: 1,
        maxUsers: 10000,
        bandwidth: 100,
        enableEncryption: true,
        enableLogging: false,
        sctpPorts: [{ localPort: 38472, remotePort: 38472 }],
        encryptAlgorithm: 'aes-256',
        certType: 'self-signed',
        extraConfig: { nfId: 'smf-001', plmn: '46001' },
      },
    };
  }

  validateSchema(schema: Record<string, unknown>, data: Record<string, unknown>) {
    const errors: ValidationError[] = [];
    this.flattenAndValidate(schema, data, '', errors);
    this.businessValidate(data, errors);
    return { valid: errors.length === 0, errors };
  }

  private flattenAndValidate(
    schema: Record<string, unknown>,
    data: Record<string, unknown>,
    prefix: string,
    errors: ValidationError[],
  ) {
    if (!schema?.properties) return;

    const props = schema.properties as Record<string, any>;
    for (const [key, propVal] of Object.entries(props)) {
      const prop = propVal as Record<string, any>;
      if (!prop) continue;

      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const propType = prop.type as string;
      const required = prop.required as boolean;
      const val = data[key];

      if (required && (val === undefined || val === null || val === '')) {
        const title = (prop.title as string) || key;
        errors.push({ path: fieldPath, message: `${title} 为必填项`, source: 'backend' });
      }

      if (val !== undefined && val !== null) {
        if (propType === 'string') {
          const strVal = String(val);
          const minLen = prop.minLength as number;
          const maxLen = prop.maxLength as number;
          if (minLen && strVal.length < minLen)
            errors.push({ path: fieldPath, message: `最少 ${minLen} 个字符`, source: 'backend' });
          if (maxLen && strVal.length > maxLen)
            errors.push({ path: fieldPath, message: `最多 ${maxLen} 个字符`, source: 'backend' });
        }
        if (propType === 'number') {
          const numVal = Number(val);
          const min = prop.min as number;
          const max = prop.max as number;
          if (min !== undefined && numVal < min)
            errors.push({ path: fieldPath, message: `最小值为 ${min}`, source: 'backend' });
          if (max !== undefined && numVal > max)
            errors.push({ path: fieldPath, message: `最大值为 ${max}`, source: 'backend' });
        }
        if (propType === 'object' && typeof val === 'object') {
          this.flattenAndValidate(prop, val as Record<string, unknown>, fieldPath, errors);
        }
      }
    }
  }

  private businessValidate(data: Record<string, unknown>, errors: ValidationError[]) {
    if (!data) return;
    this.validateIPAddress(data, errors);
    this.validateCellIDFormat(data, errors);
    this.validateMCCMNC(data, errors);
    this.validatePortRangeByType(data, errors);
    this.validateBandwidthFrequency(data, errors);
  }

  private validateIPAddress(data: Record<string, unknown>, errors: ValidationError[]) {
    const ipRaw = data.ipAddress;
    if (!ipRaw) return;
    const ipStr = String(ipRaw);
    if (!net.isIP(ipStr)) {
      errors.push({
        path: 'ipAddress',
        message: 'IP 地址格式无效，请输入合法的 IPv4 地址',
        source: 'backend',
      });
    }
    if (ipStr.startsWith('127.') || ipStr.startsWith('0.')) {
      errors.push({
        path: 'ipAddress',
        message: '不允许使用回环地址或全零地址作为管理 IP',
        source: 'backend',
      });
    }
  }

  private validateCellIDFormat(data: Record<string, unknown>, errors: ValidationError[]) {
    const cellIdRaw = data.cellId;
    if (!cellIdRaw) return;
    const cellIdStr = String(cellIdRaw);
    if (!/^CELL-\d{3}$/.test(cellIdStr)) {
      errors.push({
        path: 'cellId',
        message: '基站 ID 格式无效，应为 CELL-xxx（如 CELL-001）',
        source: 'backend',
      });
    }
    const cellType = String(data.cellType || '');
    if (cellType === 'femto' && cellIdStr.startsWith('CELL-')) {
      errors.push({
        path: 'cellId',
        message: '家庭基站 ID 不应包含 CELL 前缀，建议使用 FEMTO-xxx 格式',
        source: 'backend',
      });
    }
  }

  private validateMCCMNC(data: Record<string, unknown>, errors: ValidationError[]) {
    const mccStr = String(data.mcc || '');
    const mncStr = String(data.mnc || '');

    if (mccStr && !mncStr)
      errors.push({ path: 'mnc', message: '填写 MCC 时必须同时填写 MNC', source: 'backend' });
    if (mncStr && !mccStr)
      errors.push({ path: 'mcc', message: '填写 MNC 时必须同时填写 MCC', source: 'backend' });

    const validMCCs: Record<string, string> = {
      '460': '中国',
      '310': '美国',
      '250': '俄罗斯',
      '440': '日本',
    };
    if (mccStr && !validMCCs[mccStr]) {
      errors.push({
        path: 'mcc',
        message: `MCC ${mccStr} 不在允许的国家码列表中（中国:460, 美国:310, 俄罗斯:250, 日本:440）`,
        source: 'backend',
      });
    }
  }

  private validatePortRangeByType(data: Record<string, unknown>, errors: ValidationError[]) {
    const cellType = String(data.cellType || '');
    const portRaw = data.port;
    if (portRaw === undefined) return;
    const portNum = Number(portRaw);

    if (cellType === 'macro' && portNum < 2048) {
      errors.push({
        path: 'port',
        message: `宏基站端口号应 ≥ 2048（当前 ${portNum}）`,
        source: 'backend',
      });
    }
    if (cellType === 'femto' && portNum > 1024) {
      errors.push({
        path: 'port',
        message: `家庭基站端口号应 ≤ 1024（当前 ${portNum}）`,
        source: 'backend',
      });
    }
    if (cellType === 'pico' && portNum < 8080) {
      errors.push({
        path: 'port',
        message: `皮基站端口号应 ≥ 8080（当前 ${portNum}）`,
        source: 'backend',
      });
    }
  }

  private validateBandwidthFrequency(data: Record<string, unknown>, errors: ValidationError[]) {
    const bandwidthRaw = data.bandwidth;
    if (bandwidthRaw === undefined) return;
    const bandwidth = Number(bandwidthRaw);
    const allowed = new Set([5, 10, 20, 40, 100]);
    if (!allowed.has(bandwidth)) {
      errors.push({
        path: 'bandwidth',
        message: `带宽 ${bandwidth} MHz 不是标准值（允许: 5, 10, 20, 40, 100 MHz）`,
        source: 'backend',
      });
    }
  }
}
