import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {A2uiSurface, basicCatalog, MarkdownContext} from '@a2ui/react/v0_9';
import type {A2uiMessage, SurfaceModel} from '@a2ui/web_core/v0_9';
import {injectBasicCatalogStyles, MessageProcessor} from '@a2ui/web_core/v0_9';
import {ApiOutlined, BookOutlined, ClearOutlined, ShoppingCartOutlined, TableOutlined,} from '@ant-design/icons';
import {Button, Card, Space, theme, Typography} from 'antd';
import {useCallback, useRef, useState} from 'react';
import {useMessageApi} from '../AIDemo.tsx';

const { Text } = Typography;

injectBasicCatalogStyles();

const SAMPLE_SCENARIOS = [
  {
    key: 'restaurant-list',
    label: '餐厅列表',
    icon: <ShoppingCartOutlined />,
    messages: [
      {
        version: 'v0.9',
        createSurface: {
          surfaceId: 'main',
          catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
        },
      },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'main',
          components: [
            { id: 'root', component: 'Column', children: ['title', 'card1', 'card2', 'card3'] },
            { id: 'title', component: 'Text', text: '# 推荐餐厅', variant: 'h2' },
            {
              id: 'card1',
              component: 'Card',
              variant: 'elevated',
              child: 'card1-content',
            },
            {
              id: 'card1-content',
              component: 'Column',
              children: ['r1-name', 'r1-cuisine', 'r1-rating', 'r1-btn'],
            },
            { id: 'r1-name', component: 'Text', text: '**川味轩**', variant: 'body' },
            { id: 'r1-cuisine', component: 'Text', text: '🌶️ 川菜 · 人均 ¥80', variant: 'caption' },
            {
              id: 'r1-rating',
              component: 'Text',
              text: '⭐⭐⭐⭐☆ 4.2 (128 评价)',
              variant: 'caption',
            },
            {
              id: 'r1-btn',
              component: 'Button',
              child: 'r1-btn-text',
              variant: 'primary',
              action: { event: { name: 'book_restaurant', context: { restaurantName: '川味轩' } } },
            },
            { id: 'r1-btn-text', component: 'Text', text: '立即预订' },
            {
              id: 'card2',
              component: 'Card',
              variant: 'elevated',
              child: 'card2-content',
            },
            {
              id: 'card2-content',
              component: 'Column',
              children: ['r2-name', 'r2-cuisine', 'r2-rating', 'r2-btn'],
            },
            { id: 'r2-name', component: 'Text', text: '**寿司之魂**', variant: 'body' },
            {
              id: 'r2-cuisine',
              component: 'Text',
              text: '🍣 日料 · 人均 ¥150',
              variant: 'caption',
            },
            {
              id: 'r2-rating',
              component: 'Text',
              text: '⭐⭐⭐⭐⭐ 4.8 (256 评价)',
              variant: 'caption',
            },
            {
              id: 'r2-btn',
              component: 'Button',
              child: 'r2-btn-text',
              variant: 'primary',
              action: {
                event: { name: 'book_restaurant', context: { restaurantName: '寿司之魂' } },
              },
            },
            { id: 'r2-btn-text', component: 'Text', text: '立即预订' },
            {
              id: 'card3',
              component: 'Card',
              variant: 'elevated',
              child: 'card3-content',
            },
            {
              id: 'card3-content',
              component: 'Column',
              children: ['r3-name', 'r3-cuisine', 'r3-rating', 'r3-btn'],
            },
            { id: 'r3-name', component: 'Text', text: '**La Piazza**', variant: 'body' },
            {
              id: 'r3-cuisine',
              component: 'Text',
              text: '🍝 意餐 · 人均 ¥200',
              variant: 'caption',
            },
            {
              id: 'r3-rating',
              component: 'Text',
              text: '⭐⭐⭐⭐☆ 4.5 (89 评价)',
              variant: 'caption',
            },
            {
              id: 'r3-btn',
              component: 'Button',
              child: 'r3-btn-text',
              variant: 'primary',
              action: {
                event: { name: 'book_restaurant', context: { restaurantName: 'La Piazza' } },
              },
            },
            { id: 'r3-btn-text', component: 'Text', text: '立即预订' },
          ],
        },
      },
    ],
  },
  {
    key: 'booking-form',
    label: '预订表单',
    icon: <BookOutlined />,
    messages: [
      {
        version: 'v0.9',
        createSurface: {
          surfaceId: 'main',
          catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
        },
      },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'main',
          components: [
            { id: 'root', component: 'Column', children: ['header', 'form-card'] },
            { id: 'header', component: 'Text', text: '# 预订餐桌', variant: 'h2' },
            { id: 'form-card', component: 'Card', variant: 'elevated', child: 'form-content' },
            {
              id: 'form-content',
              component: 'Column',
              children: ['name-field', 'date-field', 'time-field', 'guests-field', 'submit-btn'],
            },
            {
              id: 'name-field',
              component: 'TextField',
              label: '姓名',
              placeholder: '请输入姓名',
              value: { path: '/booking/name' },
            },
            {
              id: 'date-field',
              component: 'DateTimeInput',
              label: '日期',
              value: { path: '/booking/date' },
              enableDate: true,
            },
            {
              id: 'time-field',
              component: 'DateTimeInput',
              label: '时间',
              value: { path: '/booking/time' },
              enableTime: true,
            },
            {
              id: 'guests-field',
              component: 'ChoicePicker',
              label: '人数',
              value: { path: '/booking/guests' },
              options: [
                { id: '1', label: '1 位' },
                { id: '2', label: '2 位' },
                { id: '4', label: '4 位' },
                { id: '6', label: '6 位' },
                { id: '8', label: '8 位+' },
              ],
            },
            {
              id: 'submit-btn',
              component: 'Button',
              child: 'submit-text',
              variant: 'primary',
              action: { event: { name: 'submit_booking' } },
            },
            { id: 'submit-text', component: 'Text', text: '确认预订' },
          ],
        },
      },
      {
        version: 'v0.9',
        updateDataModel: {
          surfaceId: 'main',
          path: '/',
          value: { booking: { name: '张三', date: '2025-12-24', time: '19:00', guests: '2' } },
        },
      },
    ],
  },
  {
    key: 'data-table',
    label: '数据列表',
    icon: <TableOutlined />,
    messages: [
      {
        version: 'v0.9',
        createSurface: {
          surfaceId: 'main',
          catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
        },
      },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'main',
          components: [
            { id: 'root', component: 'Column', children: ['title', 'list'] },
            { id: 'title', component: 'Text', text: '# 销售数据概览', variant: 'h2' },
            { id: 'list', component: 'List', child: 'list-item', data: { path: '/sales' } },
            {
              id: 'list-item',
              component: 'Card',
              variant: 'elevated',
              child: 'item-content',
            },
            {
              id: 'item-content',
              component: 'Column',
              children: ['item-product', 'item-revenue', 'item-status'],
            },
            { id: 'item-product', component: 'Text', text: { path: '/product' }, variant: 'body' },
            {
              id: 'item-revenue',
              component: 'Text',
              text: { path: '/revenue' },
              variant: 'caption',
            },
            { id: 'item-status', component: 'Text', text: { path: '/status' }, variant: 'caption' },
          ],
        },
      },
      {
        version: 'v0.9',
        updateDataModel: {
          surfaceId: 'main',
          path: '/',
          value: {
            sales: [
              { product: '🍎 iPhone 16 Pro', revenue: '¥8,999 - 销量 2,341', status: '✅ 热销' },
              { product: '💻 MacBook Air M4', revenue: '¥9,499 - 销量 1,892', status: '✅ 热销' },
              { product: '⌚ Apple Watch Ultra', revenue: '¥5,999 - 销量 856', status: '📈 上升' },
              { product: '🎧 AirPods Pro 3', revenue: '¥1,999 - 销量 3,421', status: '🔥 爆款' },
              {
                product: '📱 Samsung Galaxy S25',
                revenue: '¥7,999 - 销量 1,234',
                status: '✅ 稳定',
              },
            ],
          },
        },
      },
      {
        version: 'v0.9',
        beginRendering: { surfaceId: 'main', root: 'root' },
      },
    ],
  },
];

function A2UI() {
  const message = useMessageApi();
  const { token } = theme.useToken();
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [surfaces, setSurfaces] = useState<SurfaceModel<ReactComponentImplementation>[]>([]);

  const processorRef = useRef<MessageProcessor<ReactComponentImplementation> | null>(null);

  const loadScenario = useCallback(
    (scenario: (typeof SAMPLE_SCENARIOS)[0]) => {
      setActiveScenario(scenario.key);

      if (!processorRef.current) {
        const p = new MessageProcessor<ReactComponentImplementation>([basicCatalog], (action) => {
          message.info(`收到 Action: ${action.name}`);
        });
        processorRef.current = p;

        p.onSurfaceCreated((surface) => {
          setSurfaces((prev) => [...prev, surface]);
        });
        p.onSurfaceDeleted((id) => {
          setSurfaces((prev) => prev.filter((s) => s.id !== id));
        });
      }

      const processor = processorRef.current;
      Array.from(processor.model.surfacesMap.keys()).forEach((id) => {
        processor.model.deleteSurface(id);
      });
      setSurfaces([]);

      processor.processMessages(scenario.messages as unknown as A2uiMessage[]);
    },
    [message],
  );

  const handleClear = useCallback(() => {
    setActiveScenario(null);
    setSurfaces([]);
    if (processorRef.current) {
      const processor = processorRef.current;
      Array.from(processor.model.surfacesMap.keys()).forEach((id) => {
        processor.model.deleteSurface(id);
      });
    }
  }, []);

  return (
    <MarkdownContext.Provider value={undefined}>
      <div>
        <Card
          title={
            <Space>
              <ApiOutlined />
              <Text strong>A2UI Protocol (v0.9.1)</Text>
            </Space>
          }
          style={{ marginBottom: 16 }}
          size="small"
        >
          <Text type="secondary">
            A2UI (Agent-to-User Interface) 让 AI Agent 通过声明式 JSON 生成交互式 UI。
            选择下方场景查看 A2UI 渲染效果。
          </Text>
        </Card>

        <Space wrap style={{ marginBottom: 16 }}>
          {SAMPLE_SCENARIOS.map((scenario) => (
            <Button
              key={scenario.key}
              icon={scenario.icon}
              type={activeScenario === scenario.key ? 'primary' : 'default'}
              onClick={() => loadScenario(scenario)}
            >
              {scenario.label}
            </Button>
          ))}
          <Button icon={<ClearOutlined />} danger onClick={handleClear}>
            清除
          </Button>
        </Space>

        {surfaces.length === 0 && !activeScenario && (
          <Card style={{ textAlign: 'center', padding: 48 }}>
            <ApiOutlined
              style={{ fontSize: 48, color: token.colorTextQuaternary, marginBottom: 16 }}
            />
            <div>
              <Text type="secondary">点击上方按钮加载 A2UI 演示场景</Text>
            </div>
          </Card>
        )}

        {surfaces.map((surface) => (
          <div key={surface.id} className="a2ui-surface-wrapper">
            <A2uiSurface surface={surface} />
          </div>
        ))}
      </div>
    </MarkdownContext.Provider>
  );
}

export default A2UI;
