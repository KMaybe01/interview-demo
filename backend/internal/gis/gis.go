package gis

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Point struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Value float64 `json:"value"`
}

// GetGISPoints  godoc
// @Summary     GIS 地理坐标数据
// @Description 生成北京中心经纬度周围的模拟 GIS 点数据（含螺旋分布），用于前端地图可视化
// @Tags        演示
// @Produce     json
// @Security    Bearer
// @Param       count query int false "点数 (1-500000)" default(100000)
// @Success     200 {object} map[string]interface{}
// @Router      /gis/points [get]
func GISPoints(c *gin.Context) {
	countStr := c.DefaultQuery("count", "100000")
	count, err := strconv.Atoi(countStr)
	if err != nil || count <= 0 || count > 500000 {
		count = 100000
	}

	points := generatePoints(count)
	c.JSON(http.StatusOK, gin.H{
		"count":  len(points),
		"points": points,
	})
}

func generatePoints(count int) []Point {
	points := make([]Point, count)
	centerX := 116.397128
	centerY := 39.916527
	for i := 0; i < count; i++ {
		angle := float64(i) * 2 * math.Pi / float64(count)
		radius := 0.01 + float64(i)*0.00001
		points[i] = Point{
			X:     centerX + radius*math.Cos(angle),
			Y:     centerY + radius*math.Sin(angle),
			Value: float64(i) / float64(count),
		}
	}
	return points
}
