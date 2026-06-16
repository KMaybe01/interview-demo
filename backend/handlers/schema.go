package handlers

import (
	"fmt"
	"net"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

type ValidationRequest struct {
	Schema map[string]interface{} `json:"schema"`
	Data   map[string]interface{} `json:"data"`
}

type ValidationError struct {
	Path    string `json:"path"`
	Message string `json:"message"`
	Source  string `json:"source"`
}

func ValidateSchema(c *gin.Context) {
	var req ValidationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var errors []ValidationError

	flattenAndValidate(req.Schema, req.Data, "", &errors)

	businessValidate(req.Data, &errors)

	c.JSON(http.StatusOK, gin.H{
		"valid":  len(errors) == 0,
		"errors": errors,
	})
}

func flattenAndValidate(schema map[string]interface{}, data map[string]interface{}, prefix string, errors *[]ValidationError) {
	if schema == nil {
		return
	}

	props, hasProps := schema["properties"].(map[string]interface{})
	if !hasProps {
		return
	}

	for key, propVal := range props {
		prop, ok := propVal.(map[string]interface{})
		if !ok {
			continue
		}

		fieldPath := key
		if prefix != "" {
			fieldPath = prefix + "." + key
		}

		propType, _ := prop["type"].(string)
		required, _ := prop["required"].(bool)

		val, hasVal := data[key]

		if required && (!hasVal || val == nil || val == "") {
			title, _ := prop["title"].(string)
			if title == "" {
				title = key
			}
			*errors = append(*errors, ValidationError{
				Path:    fieldPath,
				Message: title + " 为必填项",
				Source:  "backend",
			})
		}

		if hasVal && val != nil {
			if propType == "string" {
				strVal, ok := val.(string)
				if ok {
					if minLen, ok := prop["minLength"].(float64); ok && len(strVal) < int(minLen) {
						*errors = append(*errors, ValidationError{Path: fieldPath, Message: "最少 " + formatFloat(minLen) + " 个字符", Source: "backend"})
					}
					if maxLen, ok := prop["maxLength"].(float64); ok && len(strVal) > int(maxLen) {
						*errors = append(*errors, ValidationError{Path: fieldPath, Message: "最多 " + formatFloat(maxLen) + " 个字符", Source: "backend"})
					}
				}
			}
			if propType == "number" {
				numVal, ok := val.(float64)
				if ok {
					if min, ok := prop["min"].(float64); ok && numVal < min {
						*errors = append(*errors, ValidationError{Path: fieldPath, Message: "最小值为 " + formatFloat(min), Source: "backend"})
					}
					if max, ok := prop["max"].(float64); ok && numVal > max {
						*errors = append(*errors, ValidationError{Path: fieldPath, Message: "最大值为 " + formatFloat(max), Source: "backend"})
					}
				}
			}
			if propType == "object" {
				if childData, ok := val.(map[string]interface{}); ok {
					flattenAndValidate(prop, childData, fieldPath, errors)
				}
			}
		}
	}
}

func businessValidate(data map[string]interface{}, errors *[]ValidationError) {
	if data == nil {
		return
	}

	validateIPAddress(data, errors)
	validateCellIDFormat(data, errors)
	validateMCCMNC(data, errors)
	validatePortRangeByType(data, errors)
	validateBandwidthFrequency(data, errors)
}

func validateIPAddress(data map[string]interface{}, errors *[]ValidationError) {
	ipRaw, ok := data["ipAddress"]
	if !ok || ipRaw == nil {
		return
	}
	ipStr, ok := ipRaw.(string)
	if !ok || ipStr == "" {
		return
	}

	if net.ParseIP(ipStr) == nil {
		*errors = append(*errors, ValidationError{
			Path:    "ipAddress",
			Message: "IP 地址格式无效，请输入合法的 IPv4 地址",
			Source:  "backend",
		})
	}

	if strings.HasPrefix(ipStr, "127.") || strings.HasPrefix(ipStr, "0.") {
		*errors = append(*errors, ValidationError{
			Path:    "ipAddress",
			Message: "不允许使用回环地址或全零地址作为管理 IP",
			Source:  "backend",
		})
	}
}

func validateCellIDFormat(data map[string]interface{}, errors *[]ValidationError) {
	cellIDRaw, ok := data["cellId"]
	if !ok || cellIDRaw == nil {
		return
	}
	cellIDStr, ok := cellIDRaw.(string)
	if !ok || cellIDStr == "" {
		return
	}

	matched, _ := regexp.MatchString(`^CELL-\d{3}$`, cellIDStr)
	if !matched {
		*errors = append(*errors, ValidationError{
			Path:    "cellId",
			Message: "基站 ID 格式无效，应为 CELL-xxx（如 CELL-001）",
			Source:  "backend",
		})
	}

	cellType, _ := data["cellType"].(string)
	if cellType == "femto" && strings.HasPrefix(cellIDStr, "CELL-") {
		*errors = append(*errors, ValidationError{
			Path:    "cellId",
			Message: "家庭基站 ID 不应包含 CELL 前缀，建议使用 FEMTO-xxx 格式",
			Source:  "backend",
		})
	}
}

func validateMCCMNC(data map[string]interface{}, errors *[]ValidationError) {
	mccRaw, ok := data["mcc"]
	if !ok || mccRaw == nil {
		return
	}
	mccStr, _ := mccRaw.(string)

	mncRaw, ok := data["mnc"]
	if !ok || mncRaw == nil {
		return
	}
	mncStr, _ := mncRaw.(string)

	if mccStr != "" && mncStr == "" {
		*errors = append(*errors, ValidationError{
			Path:    "mnc",
			Message: "填写 MCC 时必须同时填写 MNC",
			Source:  "backend",
		})
	}
	if mncStr != "" && mccStr == "" {
		*errors = append(*errors, ValidationError{
			Path:    "mcc",
			Message: "填写 MNC 时必须同时填写 MCC",
			Source:  "backend",
		})
	}

	validMCCs := map[string]string{
		"460": "中国",
		"310": "美国",
		"250": "俄罗斯",
		"440": "日本",
	}
	if mccStr != "" {
		if _, valid := validMCCs[mccStr]; !valid {
			*errors = append(*errors, ValidationError{
				Path:    "mcc",
				Message: "MCC " + mccStr + " 不在允许的国家码列表中（中国:460, 美国:310, 俄罗斯:250, 日本:440）",
				Source:  "backend",
			})
		}
	}
}

func validatePortRangeByType(data map[string]interface{}, errors *[]ValidationError) {
	cellType, _ := data["cellType"].(string)
	portRaw, ok := data["port"]
	if !ok || portRaw == nil {
		return
	}
	portNum, ok := portRaw.(float64)
	if !ok {
		return
	}

	if cellType == "macro" && portNum < 2048 {
		*errors = append(*errors, ValidationError{
			Path:    "port",
			Message: fmt.Sprintf("宏基站端口号应 ≥ 2048（当前 %d）", int(portNum)),
			Source:  "backend",
		})
	}
	if cellType == "femto" && portNum > 1024 {
		*errors = append(*errors, ValidationError{
			Path:    "port",
			Message: fmt.Sprintf("家庭基站端口号应 ≤ 1024（当前 %d）", int(portNum)),
			Source:  "backend",
		})
	}
	if cellType == "pico" && portNum < 8080 {
		*errors = append(*errors, ValidationError{
			Path:    "port",
			Message: fmt.Sprintf("皮基站端口号应 ≥ 8080（当前 %d）", int(portNum)),
			Source:  "backend",
		})
	}
}

func validateBandwidthFrequency(data map[string]interface{}, errors *[]ValidationError) {
	bandwidthRaw, ok := data["bandwidth"]
	if !ok || bandwidthRaw == nil {
		return
	}
	bandwidth, ok := bandwidthRaw.(float64)
	if !ok {
		return
	}

	allowed := map[float64]bool{5: true, 10: true, 20: true, 40: true, 100: true}
	if !allowed[bandwidth] {
		*errors = append(*errors, ValidationError{
			Path:    "bandwidth",
			Message: fmt.Sprintf("带宽 %.0f MHz 不是标准值（允许: 5, 10, 20, 40, 100 MHz）", bandwidth),
			Source:  "backend",
		})
	}
}

func formatFloat(f float64) string {
	if f == float64(int(f)) {
		return fmt.Sprintf("%d", int(f))
	}
	return fmt.Sprintf("%g", f)
}
