package services

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

type ChunkingStrategy string

const (
	ChunkingRecursive ChunkingStrategy = "recursive"
	ChunkingToken     ChunkingStrategy = "token"
	ChunkingMarkdown  ChunkingStrategy = "markdown"
	ChunkingFixed     ChunkingStrategy = "fixed"
)

type TextChunker struct {
	Strategy     ChunkingStrategy
	ChunkSize    int
	ChunkOverlap int
	Separators   []string
}

func NewTextChunker(strategy ChunkingStrategy) *TextChunker {
	switch strategy {
	case ChunkingToken:
		return &TextChunker{
			Strategy:     strategy,
			ChunkSize:    512,
			ChunkOverlap: 50,
			Separators:   []string{"\n\n", "\n", "。", "！", "？", "；", "，", " ", ""},
		}
	case ChunkingMarkdown:
		return &TextChunker{
			Strategy:     strategy,
			ChunkSize:    1000,
			ChunkOverlap: 100,
			Separators:   []string{"\n##", "\n###", "\n####", "\n\n", "\n", "。", " "},
		}
	case ChunkingFixed:
		return &TextChunker{
			Strategy:     strategy,
			ChunkSize:    500,
			ChunkOverlap: 0,
			Separators:   []string{},
		}
	default:
		return &TextChunker{
			Strategy:     ChunkingRecursive,
			ChunkSize:    512,
			ChunkOverlap: 50,
			Separators:   []string{"\n\n", "\n", "。", "！", "？", "；", "，", " ", ""},
		}
	}
}

type Chunk struct {
	Content  string
	Index    int
	Length   int
	Metadata map[string]interface{}
}

func (c *TextChunker) ChunkText(text string) []Chunk {
	switch c.Strategy {
	case ChunkingRecursive:
		return c.recursiveChunk(text, c.Separators, 0)
	case ChunkingToken:
		return c.tokenChunk(text)
	case ChunkingMarkdown:
		return c.markdownChunk(text)
	case ChunkingFixed:
		return c.fixedChunk(text)
	default:
		return c.recursiveChunk(text, c.Separators, 0)
	}
}

func (c *TextChunker) recursiveChunk(text string, separators []string, depth int) []Chunk {
	if len(text) == 0 {
		return nil
	}

	if depth >= len(separators) {
		return c.fixedChunk(text)
	}

	separator := separators[depth]
	remaining := text
	var chunks []Chunk
	index := 0

	for len(remaining) > 0 {
		if utf8.RuneCountInString(remaining) <= c.ChunkSize {
			chunks = append(chunks, Chunk{
				Content: strings.TrimSpace(remaining),
				Index:   index,
				Length:  utf8.RuneCountInString(remaining),
				Metadata: map[string]interface{}{
					"strategy": string(c.Strategy),
					"depth":    depth,
				},
			})
			break
		}

		pos := c.findSplitPoint(remaining, separator)
		if pos == -1 {
			subChunks := c.recursiveChunk(remaining, separators, depth+1)
			for _, sc := range subChunks {
				sc.Index = index
				chunks = append(chunks, sc)
				index++
			}
			break
		}

		chunkText := strings.TrimSpace(remaining[:pos])
		if len(chunkText) > 0 {
			chunks = append(chunks, Chunk{
				Content: chunkText,
				Index:   index,
				Length:  utf8.RuneCountInString(chunkText),
				Metadata: map[string]interface{}{
					"strategy": string(c.Strategy),
					"depth":    depth,
				},
			})
			index++
		}

		overlapRunes := utf8.RuneCountInString(remaining[:pos]) - c.ChunkOverlap
		if overlapRunes < 0 {
			overlapRunes = 0
		}
		remaining = remaining[c.runeIndexToByte(remaining, overlapRunes):]
	}

	return chunks
}

func (c *TextChunker) tokenChunk(text string) []Chunk {
	words := strings.Fields(text)
	var chunks []Chunk
	index := 0

	for i := 0; i < len(words); i += c.ChunkSize - c.ChunkOverlap {
		end := i + c.ChunkSize
		if end > len(words) {
			end = len(words)
		}

		chunkWords := words[i:end]
		chunkText := strings.Join(chunkWords, " ")

		chunks = append(chunks, Chunk{
			Content: chunkText,
			Index:   index,
			Length:  len(chunkWords),
			Metadata: map[string]interface{}{
				"strategy":   "token",
				"tokenCount": len(chunkWords),
			},
		})
		index++

		if end == len(words) {
			break
		}
	}

	return chunks
}

func (c *TextChunker) markdownChunk(text string) []Chunk {
	lines := strings.Split(text, "\n")
	var chunks []Chunk
	index := 0
	currentChunk := ""

	for _, line := range lines {
		if strings.HasPrefix(line, "#") && len(currentChunk) > 0 {
			chunks = append(chunks, Chunk{
				Content: strings.TrimSpace(currentChunk),
				Index:   index,
				Length:  utf8.RuneCountInString(currentChunk),
				Metadata: map[string]interface{}{
					"strategy": "markdown",
					"type":     "section",
				},
			})
			index++
			currentChunk = line + "\n"
		} else {
			currentChunk += line + "\n"
		}

		if utf8.RuneCountInString(currentChunk) >= c.ChunkSize {
			chunks = append(chunks, Chunk{
				Content: strings.TrimSpace(currentChunk),
				Index:   index,
				Length:  utf8.RuneCountInString(currentChunk),
				Metadata: map[string]interface{}{
					"strategy": "markdown",
					"type":     "overflow",
				},
			})
			index++
			currentChunk = ""
		}
	}

	if len(currentChunk) > 0 {
		chunks = append(chunks, Chunk{
			Content: strings.TrimSpace(currentChunk),
			Index:   index,
			Length:  utf8.RuneCountInString(currentChunk),
			Metadata: map[string]interface{}{
				"strategy": "markdown",
				"type":     "remaining",
			},
		})
	}

	return chunks
}

func (c *TextChunker) fixedChunk(text string) []Chunk {
	runes := []rune(text)
	var chunks []Chunk
	index := 0

	for i := 0; i < len(runes); i += c.ChunkSize {
		end := i + c.ChunkSize
		if end > len(runes) {
			end = len(runes)
		}

		chunkText := string(runes[i:end])
		chunks = append(chunks, Chunk{
			Content: chunkText,
			Index:   index,
			Length:  end - i,
			Metadata: map[string]interface{}{
				"strategy": "fixed",
				"start":    i,
				"end":      end,
			},
		})
		index++
	}

	return chunks
}

func (c *TextChunker) findSplitPoint(text, separator string) int {
	if separator == "" {
		return c.ChunkSize
	}

	pos := strings.Index(text, separator)
	if pos == -1 || pos > c.ChunkSize {
		return -1
	}
	return pos + len(separator)
}

func (c *TextChunker) runeIndexToByte(text string, runeIndex int) int {
	count := 0
	for i := range text {
		if count >= runeIndex {
			return i
		}
		count++
	}
	return len(text)
}

type ChunkerManager struct {
	chunkers map[ChunkingStrategy]*TextChunker
}

func NewChunkerManager() *ChunkerManager {
	return &ChunkerManager{
		chunkers: map[ChunkingStrategy]*TextChunker{
			ChunkingRecursive: NewTextChunker(ChunkingRecursive),
			ChunkingToken:     NewTextChunker(ChunkingToken),
			ChunkingMarkdown:  NewTextChunker(ChunkingMarkdown),
			ChunkingFixed:     NewTextChunker(ChunkingFixed),
		},
	}
}

func (m *ChunkerManager) GetChunker(strategy ChunkingStrategy) *TextChunker {
	if chunker, exists := m.chunkers[strategy]; exists {
		return chunker
	}
	return m.chunkers[ChunkingRecursive]
}

func (m *ChunkerManager) ChunkDocument(content, mimeType string) []Chunk {
	strategy := m.selectStrategy(mimeType)
	chunker := m.GetChunker(strategy)
	return chunker.ChunkText(content)
}

func (m *ChunkerManager) selectStrategy(mimeType string) ChunkingStrategy {
	switch {
	case strings.Contains(mimeType, "markdown"):
		return ChunkingMarkdown
	case strings.Contains(mimeType, "text/plain"):
		return ChunkingToken
	default:
		return ChunkingRecursive
	}
}

type TextPreprocessor struct{}

func NewTextPreprocessor() *TextPreprocessor {
	return &TextPreprocessor{}
}

func (p *TextPreprocessor) Clean(text string) string {
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	text = regexp.MustCompile(`[^\w\s\x{4e00}-\x{9fa5}\x{3000}-\x{303f}\x{ff00}-\x{ffef}.,!?;:'"()\[\]{}\-+]`).ReplaceAllString(text, "")
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	return strings.TrimSpace(text)
}

func (p *TextPreprocessor) Normalize(text string) string {
	replacer := strings.NewReplacer(
		"，", ",",
		"。", ".",
		"！", "!",
		"？", "?",
		"；", ";",
		"：", ":",
	)
	return replacer.Replace(text)
}

func (p *TextPreprocessor) SplitSentences(text string) []string {
	sentences := regexp.MustCompile(`[。！？.!?]+`).Split(text, -1)
	var result []string
	for _, s := range sentences {
		s = strings.TrimSpace(s)
		if len(s) > 0 {
			result = append(result, s)
		}
	}
	return result
}
