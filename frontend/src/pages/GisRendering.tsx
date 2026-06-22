import { Card, Col, Row, Slider, Space, Statistic, Tag } from "antd"
import { Zoom } from "ol/control"
import "ol/ol.css"
import Feature from "ol/Feature"
import Point from "ol/geom/Point"
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import OLMap from "ol/Map"
import { useGeographic } from "ol/proj"
import ClusterSource from "ol/source/Cluster"
import OSM from "ol/source/OSM"
import VectorSource from "ol/source/Vector"
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style"
import View from "ol/View"
import { useCallback, useEffect, useRef, useState } from "react"

interface GisPoint {
  lon: number
  lat: number
  value: number
}

function generatePoints(count: number, centerLon = 116.397, centerLat = 39.908): GisPoint[] {
  const points: GisPoint[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 0.001 + Math.random() * 0.3
    points.push({
      lon: centerLon + dist * Math.cos(angle),
      lat: centerLat + dist * Math.sin(angle) * 0.7,
      value: Math.random(),
    })
  }
  return points
}

const DEFAULT_COUNT = 100000

export default function GisRendering() {
  useGeographic()

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<OLMap | null>(null)
  const clusterSourceRef = useRef<ClusterSource | null>(null)
  const vectorSourceRef = useRef<VectorSource | null>(null)
  const dataCache = useRef<Feature[]>([])

  const [count, setCount] = useState(DEFAULT_COUNT)
  const [localCount, setLocalCount] = useState(DEFAULT_COUNT)
  const [clusterDist, setClusterDist] = useState(40)
  const [renderTime, setRenderTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(0)
  const moveEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshViewport = useCallback(() => {
    const map = mapInstance.current
    const vectorSource = vectorSourceRef.current
    if (!map || !vectorSource) return

    const start = performance.now()
    const extent = map.getView().calculateExtent(map.getSize())
    const extentFeatures: Feature[] = []
    for (const feat of dataCache.current) {
      const geom = feat.getGeometry()
      if (geom?.intersectsExtent(extent)) {
        extentFeatures.push(feat)
      }
    }

    vectorSource.clear()
    vectorSource.addFeatures(extentFeatures)
    setVisibleCount(extentFeatures.length)
    setRenderTime(performance.now() - start)
  }, [])

  useEffect(() => {
    setLoading(true)
    const points = generatePoints(count)
    dataCache.current = points.map(
      (p) =>
        new Feature({
          geometry: new Point([p.lon, p.lat]),
          value: p.value,
        }),
    )
    setLoading(false)
    refreshViewport()
  }, [count, refreshViewport])

  useEffect(() => {
    if (!mapRef.current) return

    const vectorSource = new VectorSource()
    const clusterSource = new ClusterSource({
      source: vectorSource,
      distance: clusterDist,
    })

    const vectorLayer = new VectorLayer({
      source: clusterSource,
      style: (feature) => {
        const clusterFeatures = feature.get("features") as Feature[]
        const size = clusterFeatures.length
        if (size > 1) {
          return new Style({
            image: new CircleStyle({
              radius: Math.min(15, 8 + Math.sqrt(size) * 2),
              fill: new Fill({ color: "rgba(55, 126, 184, 0.7)" }),
              stroke: new Stroke({ color: "rgba(55, 126, 184, 0.9)", width: 1 }),
            }),
            text: new Text({
              text: size.toString(),
              font: "bold 11px sans-serif",
              fill: new Fill({ color: "#fff" }),
              stroke: new Stroke({ color: "rgba(0,0,0,0.4)", width: 3 }),
            }),
          })
        }
        const original = clusterFeatures[0]
        const value = original.get("value") as number
        const hue = Math.round(200 - value * 120)
        return new Style({
          image: new CircleStyle({
            radius: 3,
            fill: new Fill({ color: `hsla(${String(hue)}, 80%, 50%, 0.7)` }),
            stroke: new Stroke({ color: `hsla(${String(hue)}, 80%, 30%, 0.9)`, width: 0.5 }),
          }),
        })
      },
    })
    clusterSourceRef.current = clusterSource
    vectorSourceRef.current = vectorSource

    const map = new OLMap({
      target: mapRef.current,
      layers: [new TileLayer({ source: new OSM({ attributions: [] }) }), vectorLayer],
      view: new View({
        center: [116.397, 39.908],
        zoom: 12,
      }),
      controls: [new Zoom()],
    })
    mapInstance.current = map

    const debouncedRefresh = () => {
      if (moveEndTimer.current != null) clearTimeout(moveEndTimer.current)
      moveEndTimer.current = setTimeout(refreshViewport, 50)
    }

    map.on("moveend", debouncedRefresh)
    refreshViewport()

    return () => {
      if (moveEndTimer.current != null) clearTimeout(moveEndTimer.current)
      map.un("moveend", debouncedRefresh)
      map.setTarget(undefined)
      dataCache.current = []
      clusterSourceRef.current = null
      vectorSourceRef.current = null
      mapInstance.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshViewport])

  useEffect(() => {
    clusterSourceRef.current?.setDistance(clusterDist)
  }, [clusterDist])

  return (
    <div>
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Card size="small">
          <Row gutter={16} align="middle">
            <Col span={4}>
              <Space>
                <Tag color="blue">{(localCount / 10000).toFixed(1)}万</Tag>
                <Statistic
                  title="渲染耗时"
                  value={renderTime.toFixed(1)}
                  suffix="ms"
                  styles={{ content: { fontSize: 18 } }}
                />
              </Space>
            </Col>
            <Col span={6}>
              <span>点位数量:</span>
              <Slider
                min={10000}
                max={500000}
                step={10000}
                value={localCount}
                onChange={setLocalCount}
                onChangeComplete={setCount}
              />
            </Col>
            <Col span={5}>
              <span>聚合距离: {clusterDist}px</span>
              <Slider min={10} max={150} step={5} value={clusterDist} onChange={setClusterDist} />
            </Col>
            <Col span={4}>
              <span>可见: {visibleCount.toLocaleString()}</span>
            </Col>
            <Col span={5}>
              <span>BBOX裁剪 + 聚合渲染</span>
            </Col>
          </Row>
        </Card>
        <Card styles={{ body: { padding: 0, position: "relative" } }}>
          <div ref={mapRef} style={{ width: "100%", height: 560 }} />
          {loading && (
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(0,0,0,0.65)",
                color: "#fff",
                padding: "4px 12px",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              加载中... {(count / 10000).toFixed(1)}万点
            </div>
          )}
        </Card>
      </Space>
    </div>
  )
}
