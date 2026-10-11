import { useEffect, useState } from 'react';
import { badge, buttonStyle, card, colors } from '../../ui/styles.ts';

/**
 * 第五关：MCP + A2A 协议控制台（实机调用教学版实现）。
 *
 * 看两个协议的差别：
 *   MCP —— 请求-响应，无状态单端点，缺输入靠 MRTR 重发
 *   A2A —— 任务对象，有状态机（submitted/working/input-required/completed/canceled）
 */

type Json = Record<string, unknown>;

const VERSIONS = ['2026-07-28', '2025-11-25', '2025-03-26', '2099-01-01'];

export default function ProtoStage() {
  const [version, setVersion] = useState('2026-07-28');
  const [discover, setDiscover] = useState<Json | null>(null);
  const [tools, setTools] = useState<
    Array<{ name: string; description: string; annotations: { sideEffect: string } }>
  >([]);
  const [toolName, setToolName] = useState('knowledge.search');
  const [args, setArgs] = useState('{"query":"报销"}');
  const [idemKey, setIdemKey] = useState('demo-key-1');
  const [callResult, setCallResult] = useState<Json | null>(null);
  const [pendingInput, setPendingInput] = useState<{
    id: string;
    prompt: string;
    requestState: string;
  } | null>(null);
  const [inputValue, setInputValue] = useState('');

  const [agents, setAgents] = useState<Array<{ id: string; name: string; description: string }>>(
    [],
  );
  const [agentId, setAgentId] = useState('researcher');
  const [text, setText] = useState('调研 MCP 与 A2A 的分工');
  const [task, setTask] = useState<Json | null>(null);

  const rpc = async (method: string, params?: Json) => {
    const res = await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'MCP-Protocol-Version': version },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    });
    return (await res.json()) as Json;
  };

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/a2a/agents');
      const data = (await res.json()) as {
        agents: Array<{ id: string; name: string; description: string }>;
      };
      setAgents(data.agents);
    })();
  }, []);

  const doDiscover = async () => setDiscover((await rpc('server/discover')) as Json);
  const doListTools = async () => {
    const res = await rpc('tools/list');
    setTools(((res.result as Json)?.tools ?? []) as typeof tools);
  };

  const doCall = async (extra?: Json) => {
    const params: Json = {
      name: toolName,
      arguments: JSON.parse(args || '{}') as Json,
      _meta: { idempotencyKey: idemKey, ...(extra ?? {}) },
    };
    const res = await rpc('tools/call', params);
    setCallResult(res);
    const result = res.result as Json | undefined;
    if (result?.resultType === 'input_required') {
      const request = (result.inputRequests as Array<{ id: string; prompt: string }>)[0];
      setPendingInput({
        id: request.id,
        prompt: request.prompt,
        requestState: String(result.requestState),
      });
    } else {
      setPendingInput(null);
    }
  };

  const resend = () =>
    doCall({ inputResponses: [{ id: pendingInput?.id ?? '', value: inputValue }] });

  const sendTask = async () => {
    const res = await fetch(`/api/a2a/agents/${agentId}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, taskId: task ? String(task.id) : undefined }),
    });
    setTask((await res.json()) as Json);
  };

  const refreshTask = async () => {
    if (!task) return;
    const res = await fetch(`/api/a2a/tasks/${String(task.id)}`);
    setTask((await res.json()) as Json);
  };

  const cancelTask = async () => {
    if (!task) return;
    const res = await fetch(`/api/a2a/tasks/${String(task.id)}/cancel`, { method: 'POST' });
    setTask((await res.json()) as Json);
  };

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <section style={{ ...card, width: 460 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>MCP 2026-07-28（无状态单端点）</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: colors.textDim }}>协议版本</span>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              style={selectStyle}
            >
              {VERSIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <button type="button" onClick={doDiscover} style={buttonStyle('ghost')}>
              server/discover
            </button>
            <button type="button" onClick={doListTools} style={buttonStyle('ghost')}>
              tools/list
            </button>
          </div>

          {discover ? (
            <pre style={preStyle}>{JSON.stringify(discover, null, 2).slice(0, 700)}</pre>
          ) : null}

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 4 }}>tools/call</div>
            <select
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              style={selectStyle}
            >
              {(tools.length
                ? tools
                : [
                    {
                      name: 'knowledge.search',
                      description: '',
                      annotations: { sideEffect: 'read' },
                    },
                  ]
              ).map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name}（{tool.annotations?.sideEffect ?? 'read'}）
                </option>
              ))}
            </select>
            <input
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              style={{ ...inputStyle, marginTop: 6 }}
            />
            <input
              value={idemKey}
              onChange={(e) => setIdemKey(e.target.value)}
              placeholder="idempotencyKey"
              style={{ ...inputStyle, marginTop: 6 }}
            />
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={() => doCall()} style={buttonStyle('primary')}>
                调用（连点两次看幂等）
              </button>
            </div>
          </div>

          {pendingInput ? (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                border: `1px dashed ${colors.warn}`,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 12, color: colors.warn }}>MRTR · {pendingInput.prompt}</div>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
              />
              <div style={{ marginTop: 6 }}>
                <button type="button" onClick={resend} style={buttonStyle('primary')}>
                  补齐后重发原请求
                </button>
              </div>
            </div>
          ) : null}

          {callResult ? <pre style={preStyle}>{JSON.stringify(callResult, null, 2)}</pre> : null}
        </section>

        <section style={{ ...card, width: 420 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>A2A v1.0（任务状态机）</div>
          <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 8 }}>
            {agents.map((agent) => (
              <div key={agent.id}>
                · <b>{agent.id}</b> {agent.name} — {agent.description}
              </div>
            ))}
          </div>

          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={selectStyle}>
            {(agents.length
              ? agents
              : [{ id: 'researcher', name: '调研 Agent', description: '' }]
            ).map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.id}
              </option>
            ))}
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
            placeholder="发给 Agent 的内容（少于 8 字会触发 input-required）"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={sendTask} style={buttonStyle('primary')}>
              message/send
            </button>
            <button type="button" onClick={refreshTask} style={buttonStyle('ghost')}>
              tasks/get
            </button>
            <button type="button" onClick={cancelTask} style={buttonStyle('danger')}>
              cancel
            </button>
          </div>

          {task ? (
            <div style={{ marginTop: 10 }}>
              <span style={badge(String(task.status) === 'completed' ? 'ok' : 'warn')}>
                {String(task.status)}
              </span>
              {task.error ? (
                <div style={{ color: colors.danger, fontSize: 12, marginTop: 6 }}>
                  error: {JSON.stringify(task.error)}
                </div>
              ) : null}
              <pre style={preStyle}>{JSON.stringify(task, null, 2).slice(0, 800)}</pre>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: 8,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: colors.panelSoft,
  color: colors.text,
  fontSize: 13,
  outline: 'none',
} as const;

const selectStyle = {
  padding: 6,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: colors.panelSoft,
  color: colors.text,
  fontSize: 13,
} as const;

const preStyle = {
  marginTop: 10,
  maxHeight: 240,
  overflow: 'auto',
  padding: 10,
  borderRadius: 8,
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  fontSize: 12,
  lineHeight: 1.6,
  color: colors.textDim,
} as const;
