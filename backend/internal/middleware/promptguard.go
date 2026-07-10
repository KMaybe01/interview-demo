package middleware

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type promptMatch struct {
	pattern string
	label   string
}

var injectionPatterns = []promptMatch{
	{"ignore all previous instructions", "prompt_injection"},
	{"ignore all previous", "prompt_injection"},
	{"forget all previous", "prompt_injection"},
	{"disregard all previous", "prompt_injection"},
	{"你是一个", "role_override_cn"},
	{"你现在是", "role_override_cn"},
	{"system prompt", "system_prompt_leak"},
	{"你被设定为", "role_override_cn"},
	{"你是", "role_override_cn"},
	{"print your instructions", "instruction_leak"},
	{"output your prompt", "instruction_leak"},
	{"reveal your prompt", "instruction_leak"},
	{"DAN", "jailbreak"},
	{"do anything now", "jailbreak"},
	{"you are free", "jailbreak"},
	{"jailbreak", "jailbreak_ref"},
}

func PromptGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodPost {
			c.Next()
			return
		}

		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.Next()
			return
		}
		c.Request.Body = io.NopCloser(strings.NewReader(string(bodyBytes)))

		bodyStr := strings.ToLower(string(bodyBytes))
		var detected []gin.H

		for _, pm := range injectionPatterns {
			if strings.Contains(bodyStr, strings.ToLower(pm.pattern)) {
				detected = append(detected, gin.H{
					"pattern": pm.pattern,
					"label":   pm.label,
				})
			}
		}

		if len(detected) > 0 {
			var parsed struct {
				Content string `json:"content"`
			}
			json.Unmarshal(bodyBytes, &parsed)

			if len(parsed.Content) == 0 || len(detected) >= 2 {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error":   "请求被安全策略拦截",
					"reason":  "detected_prompt_injection",
					"matches": detected,
				})
				return
			}
		}

		c.Next()
	}
}
