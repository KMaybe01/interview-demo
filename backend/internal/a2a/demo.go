package a2a

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"unicode"
)

// termDict 是内置的中英术语词典；未命中的词原样保留（不做编造式翻译）。
var termDict = map[string]string{
	"人工智能": "artificial intelligence", "机器学习": "machine learning", "深度学习": "deep learning",
	"神经网络": "neural network", "大模型": "large language model", "智能体": "agent",
	"提示词": "prompt", "向量数据库": "vector database", "检索增强生成": "retrieval augmented generation",
	"嵌入": "embedding", "微调": "fine-tuning", "推理": "inference", "训练": "training",
	"数据集": "dataset", "分词": "tokenization", "上下文": "context", "注意力机制": "attention mechanism",
	"变换器": "transformer", "对话": "conversation", "知识库": "knowledge base", "接口": "interface",
	"服务": "service", "服务端": "server", "客户端": "client", "任务": "task",
	"消息": "message", "工具": "tool", "工作流": "workflow", "流式": "streaming", "取消": "cancel",
}

// enWordRe 匹配英文单词（允许内部连字符与撇号，例如 fine-tuning）。
var enWordRe = regexp.MustCompile(`[A-Za-z]+(?:[-'][A-Za-z]+)*`)

// zhKeys 按 rune 长度降序排列，保证「服务端」先于「服务」被替换。
var zhKeys = sortedZhKeys()

// enPhrases 是需要整体匹配的多词英文短语（长短语优先）。
var enPhrases = buildEnPhrases()

// enWords 是单词级英文 → 中文映射。
var enWords = buildEnWords()

// DefaultRegistry 返回已注册 3 个内置演示 Agent 的注册表。
func DefaultRegistry() *AgentRegistry {
	reg := NewAgentRegistry()
	reg.RegisterAgent(NewEchoAgentCard(""), NewEchoRunner())
	reg.RegisterAgent(NewAnalyzerAgentCard(""), NewAnalyzerRunner())
	reg.RegisterAgent(NewTranslatorAgentCard(""), NewTranslatorRunner())
	return reg
}

// NewEchoAgentCard 返回 echo-agent 的 Agent Card。
func NewEchoAgentCard(url string) AgentCard {
	return AgentCard{
		ID:          "echo-agent",
		Name:        "Echo Agent",
		Description: "回显输入文本并统计字符数、词数与行数，用于验证 A2A 链路连通性。",
		URL:         url,
		Version:     "1.0.0",
		Provider:    &Provider{Organization: "interview-demo"},
		Capabilities: Capabilities{
			Streaming:              true,
			PushNotifications:      false,
			StateTransitionHistory: true,
		},
		Authentication: &Authentication{Schemes: []string{"none"}},
		Skills: []Skill{{
			ID:           "echo",
			Name:         "文本回显与统计",
			Description:  "回显原文，并输出字符数、词数、行数、大小写转换与倒序文本。",
			Tags:         []string{"echo", "text", "counter"},
			Examples:     []string{"Hello A2A", "第一行\n第二行"},
			InputSchema:  map[string]any{"type": "string"},
			OutputSchema: map[string]any{"type": "object"},
		}},
		DefaultInputModes:  []string{"text"},
		DefaultOutputModes: []string{"text", "data"},
	}
}

// NewAnalyzerAgentCard 返回 analyzer-agent 的 Agent Card。
func NewAnalyzerAgentCard(url string) AgentCard {
	return AgentCard{
		ID:          "analyzer-agent",
		Name:        "Analyzer Agent",
		Description: "对输入文本做真实字符统计与词频分析（中英文/数字/标点、最长词、Top5 词频）。",
		URL:         url,
		Version:     "1.0.0",
		Provider:    &Provider{Organization: "interview-demo"},
		Capabilities: Capabilities{
			Streaming:              true,
			PushNotifications:      false,
			StateTransitionHistory: true,
		},
		Authentication: &Authentication{Schemes: []string{"none"}},
		Skills: []Skill{{
			ID:           "text-analyze",
			Name:         "文本分析",
			Description:  "统计中文/英文/数字/标点/空白字符数，给出最长词与词频 Top5。",
			Tags:         []string{"nlp", "analysis", "statistics"},
			Examples:     []string{"人工智能 人工智能 hello hello world 123！"},
			InputSchema:  map[string]any{"type": "string"},
			OutputSchema: map[string]any{"type": "object"},
		}},
		DefaultInputModes:  []string{"text"},
		DefaultOutputModes: []string{"text", "data"},
	}
}

// NewTranslatorAgentCard 返回 translator-agent 的 Agent Card。
func NewTranslatorAgentCard(url string) AgentCard {
	return AgentCard{
		ID:          "translator-agent",
		Name:        "Translator Agent",
		Description: "内置中英术语词典的术语映射翻译器：命中术语替换，未命中词汇原样保留。",
		URL:         url,
		Version:     "1.0.0",
		Provider:    &Provider{Organization: "interview-demo"},
		Capabilities: Capabilities{
			Streaming:              true,
			PushNotifications:      false,
			StateTransitionHistory: true,
		},
		Authentication: &Authentication{Schemes: []string{"none"}},
		Skills: []Skill{{
			ID:           "term-translate",
			Name:         "术语映射翻译",
			Description:  "基于内置中英术语词典做真实替换，未命中的词原样保留。",
			Tags:         []string{"translation", "terminology", "dictionary"},
			Examples:     []string{"人工智能 与 机器学习", "machine learning and vector database"},
			InputSchema:  map[string]any{"type": "string"},
			OutputSchema: map[string]any{"type": "object"},
		}},
		DefaultInputModes:  []string{"text"},
		DefaultOutputModes: []string{"text", "data"},
	}
}

// EchoRunner 回显输入并做真实统计（字符数/词数/行数/大小写转换/倒序）。
type EchoRunner struct{}

// NewEchoRunner 创建回显执行器。
func NewEchoRunner() *EchoRunner { return &EchoRunner{} }

// Run 实现 Runner 接口；输入为空时要求补充输入。
func (EchoRunner) Run(ctx context.Context, task *Task, input []Part) ([]Artifact, error) {
	text := TextOf(input)
	if strings.TrimSpace(text) == "" {
		return nil, NewInputRequired("请输入需要回显的文本内容")
	}
	runes := []rune(text)
	chars := len(runes)
	words := len(strings.Fields(text))
	lines := strings.Count(text, "\n") + 1

	summary := fmt.Sprintf("回显：%s\n字符数=%d 词数=%d 行数=%d", text, chars, words, lines)
	data := map[string]any{
		"echo":       text,
		"characters": chars,
		"words":      words,
		"lines":      lines,
		"upper":      strings.ToUpper(text),
		"lower":      strings.ToLower(text),
		"reversed":   string(reverseRunes(runes)),
	}
	return []Artifact{{
		Name:      "echo-result",
		Parts:     []Part{NewTextPart(summary), NewDataPart(data)},
		Index:     0,
		LastChunk: true,
	}}, nil
}

// AnalyzerRunner 统计字符分布、最长词与词频 TopN。
type AnalyzerRunner struct{}

// NewAnalyzerRunner 创建文本分析执行器。
func NewAnalyzerRunner() *AnalyzerRunner { return &AnalyzerRunner{} }

// Run 实现 Runner 接口。
func (AnalyzerRunner) Run(ctx context.Context, task *Task, input []Part) ([]Artifact, error) {
	text := TextOf(input)
	if strings.TrimSpace(text) == "" {
		return nil, NewInputRequired("请输入需要分析的文本内容")
	}
	stats := analyze(text, 5)
	summary := fmt.Sprintf(
		"总字符 %d：中文 %d，英文 %d，数字 %d，标点 %d，空白 %d；最长词：%s",
		stats.Total, stats.Chinese, stats.English, stats.Digits, stats.Punctuation, stats.Spaces, stats.LongestWord,
	)
	data := map[string]any{
		"total":       stats.Total,
		"chinese":     stats.Chinese,
		"english":     stats.English,
		"digits":      stats.Digits,
		"punctuation": stats.Punctuation,
		"spaces":      stats.Spaces,
		"lines":       stats.Lines,
		"longestWord": stats.LongestWord,
		"topWords":    stats.TopWords,
	}
	return []Artifact{{
		Name:      "text-analysis",
		Parts:     []Part{NewTextPart(summary), NewDataPart(data)},
		Index:     0,
		LastChunk: true,
	}}, nil
}

// TranslatorRunner 基于内置术语词典做术语映射翻译。
type TranslatorRunner struct{}

// NewTranslatorRunner 创建术语翻译执行器。
func NewTranslatorRunner() *TranslatorRunner { return &TranslatorRunner{} }

// Run 实现 Runner 接口；自动判断方向：含汉字走中译英，否则走英译中。
func (TranslatorRunner) Run(ctx context.Context, task *Task, input []Part) ([]Artifact, error) {
	text := TextOf(input)
	if strings.TrimSpace(text) == "" {
		return nil, NewInputRequired("请输入需要翻译的文本内容")
	}
	var result, direction string
	if containsHan(text) {
		direction = "zh→en"
		result = translateZhToEn(text)
	} else {
		direction = "en→zh"
		result = translateEnToZh(text)
	}
	data := map[string]any{
		"direction": direction,
		"source":    text,
		"result":    result,
		"terms":     len(termDict),
	}
	return []Artifact{{
		Name:      "term-translation",
		Parts:     []Part{NewTextPart(result), NewDataPart(data)},
		Index:     0,
		LastChunk: true,
	}}, nil
}

// TextStats 是文本分析结果。
type TextStats struct {
	Total       int        `json:"total"`
	Chinese     int        `json:"chinese"`
	English     int        `json:"english"`
	Digits      int        `json:"digits"`
	Punctuation int        `json:"punctuation"`
	Spaces      int        `json:"spaces"`
	Lines       int        `json:"lines"`
	LongestWord string     `json:"longestWord,omitempty"`
	TopWords    []WordStat `json:"topWords"`
}

// WordStat 是一项词频统计。
type WordStat struct {
	Word  string `json:"word"`
	Count int    `json:"count"`
}

// analyze 统计字符分布、最长词与词频 TopN。
func analyze(text string, topN int) TextStats {
	var st TextStats
	freq := make(map[string]int)
	var longest string

	st.Lines = strings.Count(text, "\n") + 1
	if text == "" {
		st.Lines = 0
	}
	for _, r := range text {
		st.Total++
		switch {
		case unicode.Is(unicode.Han, r):
			st.Chinese++
		case unicode.IsLetter(r):
			st.English++
		case unicode.IsDigit(r):
			st.Digits++
		case unicode.IsSpace(r):
			st.Spaces++
		case unicode.IsPunct(r):
			st.Punctuation++
		}
	}
	for _, w := range tokenize(text) {
		freq[w]++
		if len([]rune(w)) > len([]rune(longest)) {
			longest = w
		}
	}
	st.LongestWord = longest
	st.TopWords = topFrequent(freq, topN)
	return st
}

// tokenize 抽取词元：汉字按单字，连续拉丁字母/数字按词并转小写。
func tokenize(text string) []string {
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
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			buf = append(buf, r)
		default:
			flush()
		}
	}
	flush()
	return out
}

// topFrequent 按词频降序、词名字典序升序返回前 n 个词。
func topFrequent(freq map[string]int, n int) []WordStat {
	list := make([]WordStat, 0, len(freq))
	for w, c := range freq {
		list = append(list, WordStat{Word: w, Count: c})
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

// reverseRunes 反转 rune 切片。
func reverseRunes(runes []rune) []rune {
	out := make([]rune, len(runes))
	for i, r := range runes {
		out[len(runes)-1-i] = r
	}
	return out
}

// translateZhToEn 按中文术语长度降序整体替换。
func translateZhToEn(text string) string {
	out := text
	for _, k := range zhKeys {
		out = strings.ReplaceAll(out, k, termDict[k])
	}
	return out
}

// translateEnToZh 先整体替换多词短语，再按单词替换；未命中原样保留。
func translateEnToZh(text string) string {
	out := text
	for _, p := range enPhrases {
		out = p.re.ReplaceAllString(out, p.zh)
	}
	return enWordRe.ReplaceAllStringFunc(out, func(w string) string {
		if zh, ok := enWords[strings.ToLower(w)]; ok {
			return zh
		}
		return w
	})
}

// containsHan 判断是否包含汉字。
func containsHan(text string) bool {
	for _, r := range text {
		if unicode.Is(unicode.Han, r) {
			return true
		}
	}
	return false
}

// enPhrase 是一条多词英文短语的匹配规则。
type enPhrase struct {
	re *regexp.Regexp
	zh string
}

// sortedZhKeys 返回按长度降序的中文术语键。
func sortedZhKeys() []string {
	keys := make([]string, 0, len(termDict))
	for k := range termDict {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		if len([]rune(keys[i])) != len([]rune(keys[j])) {
			return len([]rune(keys[i])) > len([]rune(keys[j]))
		}
		return keys[i] < keys[j]
	})
	return keys
}

// buildEnPhrases 由词典的英文值构造短语规则（仅处理含空格的多词短语）。
func buildEnPhrases() []enPhrase {
	var out []enPhrase
	for zh, en := range termDict {
		if !strings.Contains(en, " ") {
			continue
		}
		out = append(out, enPhrase{re: regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(en) + `\b`), zh: zh})
	}
	sort.Slice(out, func(i, j int) bool { return len(out[i].re.String()) > len(out[j].re.String()) })
	return out
}

// buildEnWords 由词典的英文值构造单词级反向映射。
func buildEnWords() map[string]string {
	out := make(map[string]string, len(termDict))
	for zh, en := range termDict {
		if strings.Contains(en, " ") {
			continue
		}
		out[strings.ToLower(en)] = zh
	}
	return out
}
