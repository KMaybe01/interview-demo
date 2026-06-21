package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type checkNodeBody struct {
	Key           string `json:"key"`
	RequiredPerms []int  `json:"requiredPerms"`
}

type checkBody struct {
	RoleCode int             `json:"roleCode" binding:"required"`
	Nodes    []checkNodeBody `json:"nodes" binding:"required"`
}

type checkNodeResult struct {
	Key        string `json:"key"`
	Accessible bool   `json:"accessible"`
}

func CheckPermissions(c *gin.Context) {
	var body checkBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results := make([]checkNodeResult, len(body.Nodes))
	for i, node := range body.Nodes {
		ok := true
		for _, p := range node.RequiredPerms {
			if (body.RoleCode & p) != p {
				ok = false
				break
			}
		}
		results[i] = checkNodeResult{
			Key:        node.Key,
			Accessible: ok,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"roleCode": body.RoleCode,
		"results":  results,
	})
}
