package handlers

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

func GetGISPoints(c *gin.Context) {
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
