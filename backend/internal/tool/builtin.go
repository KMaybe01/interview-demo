package tool

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
)

// KnowledgeSearcher 是知识库检索能力的抽象，由 internal/knowledge 适配实现。
// 这样工具层不反向依赖 RAG 包，保持依赖方向单向。
type KnowledgeSearcher interface {
	// Search 在指定知识库检索与 query 相关的片段；kbID 为空表示检索全部知识库。
	Search(ctx context.Context, kbID, query string, topK int) ([]KnowledgeHit, error)
}

// KnowledgeHit 是一条知识库检索命中结果。
type KnowledgeHit struct {
	Content  string  `json:"content"`
	Source   string  `json:"source,omitempty"`
	Score    float64 `json:"score"`
	Document string  `json:"document,omitempty"`
}

// BuiltinOptions 是注册内置工具时的可选依赖。
type BuiltinOptions struct {
	// Searcher 非空时注册 search_knowledge 工具。
	Searcher KnowledgeSearcher
	// Clock 用于测试注入固定时间；为空使用 time.Now。
	Clock func() time.Time
}

// RegisterBuiltins 注册全部内置工具。
//
// 内置工具清单：
//   - get_current_time  L0 当前时间（含多时区）
//   - calculate         L0 四则运算求值（自研递归下降 parser，不使用 eval）
//   - text_stats        L0 文本统计（字符/词/行/词频 TopN）
//   - json_path         L0 JSON 路径取值
//   - uuid_gen          L0 生成 UUID
//   - search_knowledge  L0 检索知识库（需注入 Searcher）
//   - format_json       L0 JSON 格式化 / 压缩
func RegisterBuiltins(reg *Registry, opts BuiltinOptions) {
	clock := opts.Clock
	if clock == nil {
		clock = time.Now
	}

	reg.Register(Definition{
		Name:        "get_current_time",
		Description: "获取当前时间。可指定 IANA 时区（如 Asia/Shanghai、UTC），返回 RFC3339、Unix 毫秒与周几。",
		Parameters: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"timezone": map[string]any{"type": "string", "description": "IANA 时区名，例如 Asia/Shanghai；留空用服务器本地时区"},
			},
		},
		Level: LevelRead, Timeout: 2 * time.Second, Idempotent: false,
	}, func(ctx context.Context, args map[string]any) (string, error) {
		now := clock()
		if tz, ok := args["timezone"].(string); ok && tz != "" {
			loc, err := time.LoadLocation(tz)
			if err != nil {
				return "", fmt.Errorf("未知时区 %q: %w", tz, err)
			}
			now = now.In(loc)
		}
		payload := map[string]any{
			"rfc3339":   now.Format(time.RFC3339),
			"date":      now.Format("2006-01-02"),
			"time":      now.Format("15:04:05"),
			"weekday":   now.Weekday().String(),
			"unixMs":    now.UnixMilli(),
			"timezone":  now.Location().String(),
			"timestamp": now.Unix(),
		}
		out, err := json.Marshal(payload)
		if err != nil {
			return "", err
		}
		return string(out), nil
	})

	reg.Register(Definition{
		Name:        "calculate",
		Description: "四则运算求值器。支持 + - * / % ^ 与括号、小数、负数。仅做纯数学计算，不做单位换算。",
		Parameters: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"expression": map[string]any{"type": "string", "description": "数学表达式，例如 1+2*(3-4)/2"},
			},
			"required": []string{"expression"},
		},
		Level: LevelRead, Timeout: 2 * time.Second, Idempotent: true,
	}, func(ctx context.Context, args map[string]any) (string, error) {
		expr, ok := args["expression"].(string)
		if !ok || strings.TrimSpace(expr) == "" {
			return "", fmt.Errorf("参数 expression 必填，例如 {\"expression\": \"1+2*3\"}")
		}
		value, err := EvalExpression(expr)
		if err != nil {
			return "", fmt.Errorf("表达式求值失败: %w", err)
		}
		return strconv.FormatFloat(value, 'f', -1, 64), nil
	})

	reg.Register(Definition{
		Name:        "text_stats",
		Description: "统计文本：总字符数、中文/英文/数字/标点/空白数量、行数、最长词与词频 TopN。",
		Parameters: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"text": map[string]any{"type": "string", "description": "待统计的文本"},
				"topN": map[string]any{"type": "integer", "description": "词频返回条数，默认 5", "default": 5},
			},
			"required": []string{"text"},
		},
		Level: LevelRead, Timeout: 3 * time.Second, Idempotent: true,
	}, func(ctx context.Context, args map[string]any) (string, error) {
		text, ok := args["text"].(string)
		if !ok {
			return "", fmt.Errorf("参数 text 必填")
		}
		topN := 5
		switch v := args["topN"].(type) {
		case float64:
			topN = int(v)
		case int:
			topN = v
		case string:
			if n, err := strconv.Atoi(v); err == nil {
				topN = n
			}
		}
		if topN < 1 {
			topN = 1
		}
		if topN > 20 {
			topN = 20
		}
		out, err := json.Marshal(AnalyzeText(text, topN))
		if err != nil {
			return "", err
		}
		return string(out), nil
	})

	reg.Register(Definition{
		Name:        "json_path",
		Description: "对 JSON 做路径取值，路径形如 a.b[0].c 或 $.a.b；不传 path 返回根节点。",
		Parameters: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"json": map[string]any{"description": "JSON 字符串或对象"},
				"path": map[string]any{"type": "string", "description": "取值路径，例如 a.b[0].c"},
			},
			"required": []string{"json"},
		},
		Level: LevelRead, Timeout: 3 * time.Second, Idempotent: true,
	}, func(ctx context.Context, args map[string]any) (string, error) {
		raw, ok := args["json"]
		if !ok {
			return "", fmt.Errorf("参数 json 必填")
		}
		var root any
		switch value := raw.(type) {
		case string:
			if err := json.Unmarshal([]byte(value), &root); err != nil {
				return "", fmt.Errorf("json 不是合法 JSON 字符串: %w", err)
			}
		default:
			encoded, err := json.Marshal(value)
			if err != nil {
				return "", err
			}
			if err := json.Unmarshal(encoded, &root); err != nil {
				return "", err
			}
		}
		path, _ := args["path"].(string)
		value, err := LookupJSONPath(root, path)
		if err != nil {
			return "", err
		}
		if s, ok := value.(string); ok {
			return s, nil
		}
		encoded, err := json.Marshal(value)
		if err != nil {
			return "", err
		}
		return string(encoded), nil
	})

	reg.Register(Definition{
		Name:        "uuid_gen",
		Description: "生成 UUID v4。可一次生成多个（1~50）。",
		Parameters: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"count": map[string]any{"type": "integer", "minimum": 1, "maximum": 50, "default": 1},
			},
		},
		Level: LevelRead, Timeout: 2 * time.Second, Idempotent: false,
	}, func(ctx context.Context, args map[string]any) (string, error) {
		count := 1
		switch v := args["count"].(type) {
		case float64:
			count = int(v)
		case int:
			count = v
		case string:
			if n, err := strconv.Atoi(v); err == nil {
				count = n
			}
		}
		if count < 1 {
			count = 1
		}
		if count > 50 {
			count = 50
		}
		ids := make([]string, 0, count)
		for i := 0; i < count; i++ {
			ids = append(ids, uuid.NewString())
		}
		if count == 1 {
			return ids[0], nil
		}
		out, err := json.Marshal(ids)
		if err != nil {
			return "", err
		}
		return string(out), nil
	})

	reg.Register(Definition{
		Name:        "format_json",
		Description: "格式化或压缩 JSON：indent=0 时压缩为单行，>0 时按指定缩进美化。用于把模型输出规整成合法 JSON。",
		Parameters: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"json":   map[string]any{"description": "JSON 字符串或对象"},
				"indent": map[string]any{"type": "integer", "description": "缩进空格数，0 表示压缩", "default": 2},
			},
			"required": []string{"json"},
		},
		Level: LevelRead, Timeout: 3 * time.Second, Idempotent: true,
	}, func(ctx context.Context, args map[string]any) (string, error) {
		raw, ok := args["json"]
		if !ok {
			return "", fmt.Errorf("参数 json 必填")
		}
		var text string
		switch v := raw.(type) {
		case string:
			text = v
		default:
			b, err := json.Marshal(v)
			if err != nil {
				return "", err
			}
			text = string(b)
		}
		indent := 2
		switch v := args["indent"].(type) {
		case float64:
			indent = int(v)
		case int:
			indent = v
		}
		if indent < 0 {
			indent = 0
		}
		if indent > 8 {
			indent = 8
		}

		var value any
		if err := json.Unmarshal([]byte(text), &value); err != nil {
			return "", fmt.Errorf("不是合法 JSON: %w", err)
		}
		var out []byte
		var err error
		if indent == 0 {
			out, err = json.Marshal(value)
		} else {
			out, err = json.MarshalIndent(value, "", strings.Repeat(" ", indent))
		}
		if err != nil {
			return "", err
		}
		return string(out), nil
	})

	if opts.Searcher != nil {
		searcher := opts.Searcher
		reg.Register(Definition{
			Name:        "search_knowledge",
			Description: "在已构建的知识库中检索与问题相关的原文片段，返回带来源与相似度分值的段落。回答知识类问题前必须先检索。",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query":           map[string]any{"type": "string", "description": "检索关键词或问题"},
					"topK":            map[string]any{"type": "integer", "description": "返回条数，默认 3", "default": 3},
					"knowledgeBaseId": map[string]any{"type": "string", "description": "限定知识库 ID；留空检索全部"},
				},
				"required": []string{"query"},
			},
			Level: LevelRead, Timeout: 8 * time.Second, Source: "knowledge", Idempotent: true,
		}, func(ctx context.Context, args map[string]any) (string, error) {
			query, ok := args["query"].(string)
			if !ok || strings.TrimSpace(query) == "" {
				return "", fmt.Errorf("参数 query 必填")
			}
			kbID, _ := args["knowledgeBaseId"].(string)
			topK := 3
			switch v := args["topK"].(type) {
			case float64:
				topK = int(v)
			case int:
				topK = v
			case string:
				if n, err := strconv.Atoi(v); err == nil {
					topK = n
				}
			}
			if topK < 1 {
				topK = 1
			}
			if topK > 20 {
				topK = 20
			}
			hits, err := searcher.Search(ctx, kbID, query, topK)
			if err != nil {
				return "", err
			}
			if len(hits) == 0 {
				return "未检索到相关内容。", nil
			}
			var b strings.Builder
			for i, h := range hits {
				b.WriteString(fmt.Sprintf("[%d] score=%.4f", i+1, h.Score))
				if h.Document != "" {
					b.WriteString(" doc=" + h.Document)
				}
				if h.Source != "" {
					b.WriteString(" src=" + h.Source)
				}
				b.WriteString("\n")
				b.WriteString(h.Content)
				b.WriteString("\n\n")
			}
			return strings.TrimSpace(b.String()), nil
		})
	}
}

// TextStatResult 是 text_stats 工具的输出结构。
type TextStatResult struct {
	Total       int         `json:"total"`
	Characters  int         `json:"characters"`
	Chinese     int         `json:"chinese"`
	English     int         `json:"english"`
	Digits      int         `json:"digits"`
	Punctuation int         `json:"punctuation"`
	Spaces      int         `json:"spaces"`
	Lines       int         `json:"lines"`
	LongestWord string      `json:"longestWord,omitempty"`
	TopWords    []WordCount `json:"topWords"`
}

// WordCount 是一项词频统计。
type WordCount struct {
	Word  string `json:"word"`
	Count int    `json:"count"`
}

// AnalyzeText 统计文本的字符分布、行数、最长词与词频 TopN。
func AnalyzeText(text string, topN int) TextStatResult {
	var res TextStatResult
	freq := make(map[string]int)
	var longest string

	res.Lines = strings.Count(text, "\n") + 1
	if text == "" {
		res.Lines = 0
	}

	for _, r := range text {
		res.Characters++
		switch {
		case unicode.Is(unicode.Han, r):
			res.Chinese++
		case unicode.IsLetter(r):
			res.English++
		case unicode.IsDigit(r):
			res.Digits++
		case unicode.IsSpace(r):
			res.Spaces++
		case unicode.IsPunct(r):
			res.Punctuation++
		}
	}
	res.Total = res.Characters

	for _, w := range TokenizeWords(text) {
		freq[w]++
		if len([]rune(w)) > len([]rune(longest)) {
			longest = w
		}
	}
	res.LongestWord = longest
	res.TopWords = TopWords(freq, topN)
	return res
}

// TokenizeWords 抽取词元：汉字按单字计，连续拉丁字母/数字（含内部连字符）按词计并转小写。
func TokenizeWords(text string) []string {
	var out []string
	var buf []rune
	flush := func() {
		if len(buf) > 0 {
			out = append(out, strings.ToLower(string(buf)))
			buf = buf[:0]
		}
	}
	for _, r := range text {
		switch {
		case unicode.Is(unicode.Han, r):
			flush()
			out = append(out, string(r))
		case unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '_':
			buf = append(buf, r)
		default:
			flush()
		}
	}
	flush()
	return out
}

// TopWords 按词频降序、词名字典序升序返回前 n 个词。
func TopWords(freq map[string]int, n int) []WordCount {
	list := make([]WordCount, 0, len(freq))
	for w, c := range freq {
		list = append(list, WordCount{Word: w, Count: c})
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].Count != list[j].Count {
			return list[i].Count > list[j].Count
		}
		return list[i].Word < list[j].Word
	})
	if n > 0 && len(list) > n {
		list = list[:n]
	}
	return list
}

// LookupJSONPath 按 a.b[0].c 形式的路径在已解码的 JSON 值中取值。
func LookupJSONPath(root any, path string) (any, error) {
	current := root
	expr := strings.TrimSpace(path)
	if expr == "" || expr == "$" {
		return current, nil
	}
	expr = strings.TrimPrefix(expr, "$")
	expr = strings.TrimPrefix(expr, ".")

	pos := 0
	for pos < len(expr) {
		if expr[pos] == '[' {
			end := strings.IndexByte(expr[pos:], ']')
			if end < 0 {
				return nil, fmt.Errorf("路径 %q 缺少右中括号", path)
			}
			inner := strings.TrimSpace(expr[pos+1 : pos+end])
			pos += end + 1
			if inner == "" {
				return nil, fmt.Errorf("路径 %q 中出现空下标", path)
			}
			var err error
			if idx, convErr := strconv.Atoi(inner); convErr == nil {
				current, err = indexInto(current, idx)
			} else {
				key := strings.Trim(inner, `"'`)
				current, err = fieldOf(current, key)
			}
			if err != nil {
				return nil, err
			}
			if pos < len(expr) && expr[pos] == '.' {
				pos++
			}
			continue
		}
		end := pos
		for end < len(expr) && expr[end] != '.' && expr[end] != '[' {
			end++
		}
		key := strings.TrimSpace(expr[pos:end])
		pos = end
		if key == "" {
			return nil, fmt.Errorf("路径 %q 中出现空字段名", path)
		}
		var err error
		current, err = fieldOf(current, key)
		if err != nil {
			return nil, err
		}
		if pos < len(expr) && expr[pos] == '.' {
			pos++
		}
	}
	return current, nil
}

func indexInto(current any, index int) (any, error) {
	list, ok := current.([]any)
	if !ok {
		return nil, fmt.Errorf("下标 %d 不能用于类型 %T", index, current)
	}
	if index < 0 || index >= len(list) {
		return nil, fmt.Errorf("数组下标 %d 越界（长度 %d）", index, len(list))
	}
	return list[index], nil
}

func fieldOf(current any, key string) (any, error) {
	object, ok := current.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("字段 %q 不能用于类型 %T", key, current)
	}
	value, ok := object[key]
	if !ok {
		return nil, fmt.Errorf("字段 %q 不存在", key)
	}
	return value, nil
}

// expressionParser 是算术表达式的递归下降解析器。
type expressionParser struct {
	src string
	pos int
}

// EvalExpression 求值表达式，支持 + - * / % ^、括号、小数与负数。
func EvalExpression(expr string) (float64, error) {
	p := &expressionParser{src: expr}
	value, err := p.parseExpr()
	if err != nil {
		return 0, err
	}
	p.skipSpaces()
	if p.pos != len(p.src) {
		return 0, fmt.Errorf("位置 %d 处出现无法解析的字符 %q", p.pos, string(p.src[p.pos]))
	}
	return value, nil
}

func (p *expressionParser) skipSpaces() {
	for p.pos < len(p.src) {
		switch p.src[p.pos] {
		case ' ', '\t', '\n', '\r':
			p.pos++
		default:
			return
		}
	}
}

func (p *expressionParser) parseExpr() (float64, error) {
	left, err := p.parseTerm()
	if err != nil {
		return 0, err
	}
	for {
		p.skipSpaces()
		if p.pos >= len(p.src) {
			return left, nil
		}
		switch p.src[p.pos] {
		case '+':
			p.pos++
			right, err := p.parseTerm()
			if err != nil {
				return 0, err
			}
			left += right
		case '-':
			p.pos++
			right, err := p.parseTerm()
			if err != nil {
				return 0, err
			}
			left -= right
		default:
			return left, nil
		}
	}
}

func (p *expressionParser) parseTerm() (float64, error) {
	left, err := p.parseUnary()
	if err != nil {
		return 0, err
	}
	for {
		p.skipSpaces()
		if p.pos >= len(p.src) {
			return left, nil
		}
		switch p.src[p.pos] {
		case '*':
			p.pos++
			right, err := p.parseUnary()
			if err != nil {
				return 0, err
			}
			left *= right
		case '/':
			p.pos++
			right, err := p.parseUnary()
			if err != nil {
				return 0, err
			}
			if right == 0 {
				return 0, fmt.Errorf("除数不能为 0")
			}
			left /= right
		case '%':
			p.pos++
			right, err := p.parseUnary()
			if err != nil {
				return 0, err
			}
			if right == 0 {
				return 0, fmt.Errorf("取模的除数不能为 0")
			}
			left = math.Mod(left, right)
		default:
			return left, nil
		}
	}
}

func (p *expressionParser) parseUnary() (float64, error) {
	p.skipSpaces()
	if p.pos >= len(p.src) {
		return 0, fmt.Errorf("表达式意外结束")
	}
	switch p.src[p.pos] {
	case '+':
		p.pos++
		return p.parseUnary()
	case '-':
		p.pos++
		value, err := p.parseUnary()
		if err != nil {
			return 0, err
		}
		return -value, nil
	}
	return p.parsePower()
}

func (p *expressionParser) parsePower() (float64, error) {
	base, err := p.parsePrimary()
	if err != nil {
		return 0, err
	}
	p.skipSpaces()
	if p.pos < len(p.src) && p.src[p.pos] == '^' {
		p.pos++
		exponent, err := p.parseUnary()
		if err != nil {
			return 0, err
		}
		return math.Pow(base, exponent), nil
	}
	return base, nil
}

func (p *expressionParser) parsePrimary() (float64, error) {
	p.skipSpaces()
	if p.pos >= len(p.src) {
		return 0, fmt.Errorf("表达式意外结束，期望数字或左括号")
	}
	if p.src[p.pos] == '(' {
		p.pos++
		value, err := p.parseExpr()
		if err != nil {
			return 0, err
		}
		p.skipSpaces()
		if p.pos >= len(p.src) || p.src[p.pos] != ')' {
			return 0, fmt.Errorf("缺少右括号")
		}
		p.pos++
		return value, nil
	}
	start := p.pos
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if (c >= '0' && c <= '9') || c == '.' {
			p.pos++
			continue
		}
		break
	}
	if start == p.pos {
		return 0, fmt.Errorf("位置 %d 处出现非法字符 %q", p.pos, string(p.src[p.pos]))
	}
	lit := p.src[start:p.pos]
	value, err := strconv.ParseFloat(lit, 64)
	if err != nil {
		return 0, fmt.Errorf("非法数字 %q", lit)
	}
	return value, nil
}
