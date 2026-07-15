import { Card, Col, Row, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { routes } from '../routes';

const { Title } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <Card>
        <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
          React 19 + Ant Design 6 + TypeScript 7 + Zustand 5 + React Router 7 + Bun 1.3 + Go 1.26 +
          Gin 1.12
        </Title>
        <Row gutter={[16, 16]}>
          {routes
            .filter((r) => r.path !== '/')
            .map((r) => (
              <Col key={r.path} xs={24} sm={12} md={8} lg={6}>
                <Card hoverable onClick={() => navigate(r.path)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {<r.icon />}
                    <Title level={5} style={{ margin: 0 }}>
                      {r.name}
                    </Title>
                  </div>
                </Card>
              </Col>
            ))}
        </Row>
      </Card>
    </div>
  );
}
