import { useState } from 'react';
import { badge, buttonStyle, card, colors } from '../../ui/styles.ts';

/**
 * 第六关：生成式 UI 的渲染沙箱。
 *
 * 核心安全边界（面试高频）：
 *   1. 组件**白名单**——spec 只能声明受控类型，禁止任意 HTML
 *   2. 结构**递归校验**——未知类型直接拒绝，不降级渲染
 *   3. 数据**受控**——text 只走文本节点，不使用 dangerouslySetInnerHTML
 */

type UiNode = {
  type: 'Text' | 'Card' | 'Table' | 'Button' | 'Stack';
  props?: Record<string, unknown>;
  children?: UiNode[];
};

const ALLOWED_TYPES = ['Text', 'Card', 'Table', 'Button', 'Stack'];

const SAMPLE: UiNode = {
  type: 'Card',
  props: { title: '报销单 #A102' },
  children: [
    { type: 'Text', props: { text: '状态：待主管审批' } },
    {
      type: 'Table',
      props: {
        columns: ['项目', '金额'],
        rows: [
          ['机票', '￥1,240'],
          ['酒店', '￥860'],
        ],
      },
    },
    { type: 'Button', props: { label: '提醒审批人', tone: 'primary' } },
  ],
};

const ILLEGAL = {
  type: 'Script',
  props: { html: '<img src=x onerror="alert(1)">' },
};

/** 递归校验：任何未知类型/非法结构都直接抛错，绝不降级渲染。 */
function validate(node: unknown, depth = 0): UiNode {
  if (depth > 8) throw new Error('结构嵌套过深');
  if (node === null || typeof node !== 'object') throw new Error('节点必须是对象');
  const candidate = node as Partial<UiNode>;
  if (!candidate.type || !ALLOWED_TYPES.includes(candidate.type)) {
    throw new Error(
      `未知组件类型：${String(candidate.type)}（白名单：${ALLOWED_TYPES.join('/')}）`,
    );
  }
  if (candidate.children && !Array.isArray(candidate.children)) {
    throw new Error('children 必须是数组');
  }
  return {
    type: candidate.type,
    props: candidate.props ?? {},
    children: candidate.children?.map((child) => validate(child, depth + 1)),
  };
}

function renderNode(node: UiNode, key: string): React.ReactNode {
  const props = node.props ?? {};
  switch (node.type) {
    case 'Text':
      return (
        <div key={key} style={{ lineHeight: 1.8 }}>
          {String(props.text ?? '')}
        </div>
      );
    case 'Card':
      return (
        <div
          key={key}
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{String(props.title ?? '')}</div>
          {node.children?.map((child, i) => renderNode(child, `${key}-${i}`))}
        </div>
      );
    case 'Stack':
      return (
        <div key={key} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {node.children?.map((child, i) => renderNode(child, `${key}-${i}`))}
        </div>
      );
    case 'Table': {
      const columns = (props.columns as string[]) ?? [];
      const rows = (props.rows as string[][]) ?? [];
      return (
        <table key={key} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  style={{
                    textAlign: 'left',
                    padding: 6,
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{ padding: 6, borderBottom: `1px solid ${colors.border}` }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case 'Button':
      return (
        <button
          key={key}
          type="button"
          style={buttonStyle(props.tone === 'primary' ? 'primary' : 'ghost')}
        >
          {String(props.label ?? '')}
        </button>
      );
  }
}

export default function UiStage() {
  const [spec, setSpec] = useState(JSON.stringify(SAMPLE, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<UiNode | null>(SAMPLE);

  const render = () => {
    try {
      setTree(validate(JSON.parse(spec)));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <section style={{ ...card, width: 420 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>UI spec（模型产出）</div>
          <textarea
            value={spec}
            onChange={(event) => setSpec(event.target.value)}
            rows={16}
            style={{ ...textareaStyle }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={render} style={buttonStyle('primary')}>
              渲染
            </button>
            <button
              type="button"
              onClick={() => setSpec(JSON.stringify(ILLEGAL, null, 2))}
              style={buttonStyle('danger')}
            >
              填入非法 spec
            </button>
          </div>
          {error ? (
            <div style={{ marginTop: 10 }}>
              <span style={badge('warn')}>被沙箱拒绝</span>
              <div style={{ color: colors.danger, fontSize: 13, marginTop: 4 }}>{error}</div>
            </div>
          ) : null}
        </section>

        <section style={{ ...card, flex: 1, minWidth: 320 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>渲染结果（白名单组件）</div>
          {tree ? renderNode(tree, 'root') : null}
          <div style={{ fontSize: 12, color: colors.textDim, marginTop: 12, lineHeight: 1.9 }}>
            白名单：{ALLOWED_TYPES.join(' / ')}。未知类型直接拒绝，文本一律走文本节点， 不使用{' '}
            <code>dangerouslySetInnerHTML</code>。
          </div>
        </section>
      </div>
    </div>
  );
}

const textareaStyle = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: colors.panelSoft,
  color: colors.text,
  fontSize: 12,
  lineHeight: 1.6,
  outline: 'none',
  resize: 'vertical' as const,
} as const;
