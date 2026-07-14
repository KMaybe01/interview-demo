import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export type AgentType = 'react' | 'function' | 'multi';

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  model: string;
  systemPrompt: string;
  tools: string[];
  memory: boolean;
  rag: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

@Injectable()
export class AgentService {
  private agents = new Map<string, AgentConfig>();

  private readonly mcpTools: MCPTool[] = [
    {
      name: 'read_file',
      description: '读取文件内容',
      parameters: { type: 'object', properties: { path: { type: 'string' } } },
    },
    {
      name: 'write_file',
      description: '写入文件内容',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' }, content: { type: 'string' } },
      },
    },
    {
      name: 'search_web',
      description: '搜索互联网信息',
      parameters: { type: 'object', properties: { query: { type: 'string' } } },
    },
    {
      name: 'calculate',
      description: '执行数学计算',
      parameters: { type: 'object', properties: { expression: { type: 'string' } } },
    },
    {
      name: 'send_email',
      description: '发送电子邮件',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
        },
      },
    },
    {
      name: 'get_weather',
      description: '获取天气信息',
      parameters: { type: 'object', properties: { city: { type: 'string' } } },
    },
    {
      name: 'execute_code',
      description: '执行代码片段',
      parameters: {
        type: 'object',
        properties: { language: { type: 'string' }, code: { type: 'string' } },
      },
    },
    {
      name: 'generate_image',
      description: '生成图片',
      parameters: { type: 'object', properties: { prompt: { type: 'string' } } },
    },
  ];

  listAgents() {
    return {
      agents: [...this.agents.values()].map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        description: a.description,
        model: a.model,
        status: a.status,
        createdAt: a.createdAt,
      })),
    };
  }

  createAgent(body: {
    name: string;
    type?: AgentType;
    description?: string;
    model?: string;
    systemPrompt?: string;
    tools?: string[];
    memory?: boolean;
    rag?: boolean;
  }) {
    const now = new Date().toISOString();
    const agent: AgentConfig = {
      id: uuidv4(),
      name: body.name,
      type: body.type || 'react',
      description: body.description || '',
      model: body.model || 'gpt-3.5-turbo',
      systemPrompt: body.systemPrompt || '',
      tools: body.tools || [],
      memory: body.memory || false,
      rag: body.rag || false,
      status: 'idle',
      createdAt: now,
      updatedAt: now,
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  executeAgent(agentId: string, input: string): { output: string; steps: any[] } {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const steps: any[] = [];
    steps.push({ type: 'thought', content: `收到输入: "${input}"，开始处理...` });

    if (agent.type === 'react') {
      steps.push({ type: 'thought', content: '使用 ReAct 模式：思考 → 行动 → 观察' });
      steps.push({ type: 'action', content: '搜索相关知识库' });
      steps.push({ type: 'observation', content: '找到 3 条相关结果' });
      steps.push({ type: 'thought', content: '基于搜索结果形成回答' });
    } else if (agent.type === 'function') {
      steps.push({ type: 'thought', content: '使用 Function Calling 模式' });
      if (agent.tools.includes('search_web')) {
        steps.push({ type: 'function_call', content: 'search_web', arguments: { query: input } });
        steps.push({ type: 'function_result', content: '返回搜索结果' });
      }
    } else if (agent.type === 'multi') {
      steps.push({ type: 'thought', content: '使用 Multi-Agent 协作模式' });
      steps.push({ type: 'sub_agent', content: '协调 Agent 分配任务给专家 Agent' });
      steps.push({ type: 'sub_agent', content: '专家 Agent 返回结果' });
      steps.push({ type: 'thought', content: '汇总所有子任务结果' });
    }

    const output = `[${agent.name}] 已处理您的输入。共执行 ${steps.length} 个步骤。`;
    agent.status = 'idle';
    agent.updatedAt = new Date().toISOString();

    return { output, steps };
  }

  executeAgentStream(
    agentId: string,
    input: string,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const result = this.executeAgent(agentId, input);

    for (const step of result.steps) {
      onChunk(JSON.stringify({ type: 'step', step, content: JSON.stringify(step) }));
    }
    onChunk(JSON.stringify({ type: 'complete', content: result.output, done: true }));

    return Promise.resolve();
  }

  deleteAgent(agentId: string) {
    return this.agents.delete(agentId);
  }

  getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  listMCPTools() {
    return { tools: this.mcpTools };
  }
}
