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

func GetSchemaConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"schema": gin.H{
			"type": "tabs",
			"key":  "root",
			"tabs": []gin.H{
				{
					"title": "基站配置",
					"key":   "cell",
					"children": []gin.H{
						{
							"type":        "card",
							"key":         "basic",
							"title":       "基本信息",
							"description": "基站核心参数",
							"children": []gin.H{
								{
									"type": "leaf",
									"key":  "basic-fields",
									"properties": gin.H{
										"cellName": gin.H{
											"type":        "string",
											"key":         "cellName",
											"title":       "基站名称",
											"required":    true,
											"placeholder": "例如: SMF-01",
											"minLength":   float64(2),
											"maxLength":   float64(32),
										},
										"fullCellName": gin.H{
											"type":         "string",
											"key":          "fullCellName",
											"title":        "完整基站名称",
											"description":  "自动生成",
											"placeholder":  "由基站类型和名称自动拼接",
											"dependencies": []string{"cellName", "cellType"},
										},
										"cellId": gin.H{
											"type":        "string",
											"key":         "cellId",
											"title":       "基站 ID",
											"required":    true,
											"placeholder": "例如: CELL-001",
										},
										"cellType": gin.H{
											"type":     "select",
											"key":      "cellType",
											"title":    "基站类型",
											"required": true,
											"options": []gin.H{
												{"label": "宏基站 (Macro)", "value": "macro"},
												{"label": "微基站 (Micro)", "value": "micro"},
												{"label": "皮基站 (Pico)", "value": "pico"},
												{"label": "家庭基站 (Femto)", "value": "femto"},
											},
											"placeholder": "选择基站类型",
										},
										"status": gin.H{
											"type":  "select",
											"key":   "status",
											"title": "运行状态",
											"options": []gin.H{
												{"label": "在线", "value": "online"},
												{"label": "离线", "value": "offline"},
												{"label": "维护", "value": "maintenance"},
											},
											"placeholder": "选择状态",
										},
									},
								},
							},
						},
						{
							"type":        "card",
							"key":         "network",
							"title":       "网络配置",
							"description": "IP 与传输参数",
							"children": []gin.H{
								{
									"type": "leaf",
									"key":  "network-fields",
									"properties": gin.H{
										"ipAddress": gin.H{
											"type":        "string",
											"key":         "ipAddress",
											"title":       "管理 IP",
											"required":    true,
											"placeholder": "例如: 192.168.1.100",
										},
										"port": gin.H{
											"type":        "number",
											"key":         "port",
											"title":       "端口号",
											"required":    true,
											"min":         float64(1024),
											"max":         float64(65535),
											"placeholder": "例如: 8080",
										},
										"mcc": gin.H{
											"type":        "string",
											"key":         "mcc",
											"title":       "MCC (移动国家码)",
											"minLength":   float64(3),
											"maxLength":   float64(3),
											"placeholder": "例如: 460",
										},
										"mnc": gin.H{
											"type":        "string",
											"key":         "mnc",
											"title":       "MNC (移动网络码)",
											"minLength":   float64(2),
											"maxLength":   float64(3),
											"placeholder": "例如: 01",
										},
										"tac": gin.H{
											"type":        "number",
											"key":         "tac",
											"title":       "TAC (跟踪区码)",
											"min":         float64(1),
											"max":         float64(65535),
											"placeholder": "例如: 1",
										},
									},
								},
							},
						},
					},
				},
				{
					"title": "传输配置",
					"key":   "transport",
					"children": []gin.H{
						{
							"type":        "card",
							"key":         "sctp-config",
							"title":       "SCTP 传输配置",
							"description": "SCTP 端口列表",
							"children": []gin.H{
								{
									"type": "leaf",
									"key":  "sctp-fields",
									"properties": gin.H{
										"sctpPorts": gin.H{
											"type":        "array",
											"key":         "sctpPorts",
											"title":       "SCTP 端口",
											"description": "添加/删除 SCTP 端口对",
											"required":    true,
											"minItems":    float64(1),
											"maxItems":    float64(10),
											"items": gin.H{
												"type": "leaf",
												"key":  "sctp-port-item",
												"properties": gin.H{
													"localPort": gin.H{
														"type":        "number",
														"key":         "localPort",
														"title":       "本地端口",
														"required":    true,
														"min":         float64(1),
														"max":         float64(65535),
														"placeholder": "例如: 38472",
													},
													"remotePort": gin.H{
														"type":        "number",
														"key":         "remotePort",
														"title":       "远端端口",
														"required":    true,
														"min":         float64(1),
														"max":         float64(65535),
														"placeholder": "例如: 38472",
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
				{
					"title": "业务参数",
					"key":   "service",
					"children": []gin.H{
						{
							"type":  "card",
							"key":   "service-config",
							"title": "业务配置",
							"children": []gin.H{
								{
									"type": "leaf",
									"key":  "service-fields",
									"properties": gin.H{
										"maxUsers": gin.H{
											"type":        "number",
											"key":         "maxUsers",
											"title":       "最大用户数",
											"required":    true,
											"min":         float64(1),
											"max":         float64(100000),
											"placeholder": "例如: 10000",
										},
										"bandwidth": gin.H{
											"type":     "select",
											"key":      "bandwidth",
											"title":    "带宽 (MHz)",
											"required": true,
											"options": []gin.H{
												{"label": "5 MHz", "value": float64(5)},
												{"label": "10 MHz", "value": float64(10)},
												{"label": "20 MHz", "value": float64(20)},
												{"label": "40 MHz", "value": float64(40)},
												{"label": "100 MHz", "value": float64(100)},
											},
										},
										"enableEncryption": gin.H{
											"type":    "switch",
											"key":     "enableEncryption",
											"title":   "启用加密",
											"default": true,
										},
										"enableLogging": gin.H{
											"type":    "switch",
											"key":     "enableLogging",
											"title":   "启用日志",
											"default": false,
										},
									},
								},
							},
						},
						{
							"type":  "card",
							"key":   "advanced",
							"title": "高级配置",
							"children": []gin.H{
								{
									"type": "leaf",
									"key":  "advanced-fields",
									"properties": gin.H{
										"encryptAlgorithm": gin.H{
											"type":  "select",
											"key":   "encryptAlgorithm",
											"title": "加密算法",
											"options": []gin.H{
												{"label": "AES-256", "value": "aes-256"},
												{"label": "AES-128", "value": "aes-128"},
												{"label": "SM4", "value": "sm4"},
											},
											"placeholder": "选择加密算法",
											"default":     "aes-256",
											"visible":     "enableEncryption === true",
										},
										"certType": gin.H{
											"type":  "select",
											"key":   "certType",
											"title": "证书类型",
											"options": []gin.H{
												{"label": "自签名", "value": "self-signed"},
												{"label": "CA 签发", "value": "ca-signed"},
											},
											"placeholder": "选择证书类型",
											"default":     "self-signed",
											"visible":     "enableEncryption === true",
										},
										"certPath": gin.H{
											"type":        "string",
											"key":         "certPath",
											"title":       "证书路径",
											"placeholder": "例如: /etc/certs/server.pem",
											"visible":     `enableEncryption === true && certType === "ca-signed"`,
										},
										"deployTime": gin.H{
											"type":  "datetime",
											"key":   "deployTime",
											"title": "部署时间",
										},
										"extraConfig": gin.H{
											"type":        "json",
											"key":         "extraConfig",
											"title":       "扩展配置",
											"description": "JSON 格式自定义参数",
										},
									},
								},
							},
						},
					},
				},
			},
		},
		"initialData": gin.H{
			"cellName":         "SMF-01",
			"cellId":           "CELL-001",
			"cellType":         "macro",
			"status":           "online",
			"ipAddress":        "192.168.1.100",
			"port":             float64(8080),
			"mcc":              "460",
			"mnc":              "01",
			"tac":              float64(1),
			"maxUsers":         float64(10000),
			"bandwidth":        float64(100),
			"enableEncryption": true,
			"enableLogging":    false,
			"sctpPorts": []gin.H{
				{"localPort": float64(38472), "remotePort": float64(38472)},
			},
			"encryptAlgorithm": "aes-256",
			"certType":         "self-signed",
			"extraConfig": gin.H{
				"nfId": "smf-001",
				"plmn": "46001",
			},
		},
	})
}
