import { Card, Col, Row, Slider, Space, Statistic, Tag } from 'antd';

export default function GisRendering() {
  return (
    <div>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Card size="small">
          <Row gutter={16} align="middle">
            <Col span={4}>
              <Space>
                <Tag color="blue">10.0万</Tag>
                <Statistic
                  title="渲染耗时"
                  value="0.0"
                  suffix="ms"
                  styles={{ content: { fontSize: 18 } }}
                />
              </Space>
            </Col>
            <Col span={6}>
              <span>点位数量:</span>
              <Slider min={10000} max={500000} step={10000} value={100000} />
            </Col>
            <Col span={5}>
              <span>聚合距离: 40px</span>
              <Slider min={10} max={150} step={5} value={40} />
            </Col>
            <Col span={4}>
              <span>可见: 0</span>
            </Col>
            <Col span={5}>
              <span>BBOX裁剪 + 聚合渲染</span>
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  );
}
