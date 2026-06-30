package knowledge

import (
	"strings"
	"testing"
)

func TestFixedChunker(t *testing.T) {
	c := NewTextChunker(ChunkingFixed)
	text := "hello world foo bar baz qux"
	chunks := c.ChunkText(text)

	if len(chunks) == 0 {
		t.Fatal("expected at least 1 chunk")
	}
	if chunks[0].Content != text {
		t.Errorf("fixed chunker with large size should return whole text")
	}
}

func TestFixedChunkerSmallSize(t *testing.T) {
	c := &TextChunker{
		Strategy:     ChunkingFixed,
		ChunkSize:    5,
		ChunkOverlap: 0,
	}
	text := "hello world foo bar"
	chunks := c.ChunkText(text)

	if len(chunks) < 2 {
		t.Fatal("expected multiple chunks")
	}
	if len(chunks[0].Content) > 6 {
		t.Errorf("expected chunk around 5 chars, got %d: %q", len(chunks[0].Content), chunks[0].Content)
	}
}

func TestRecursiveChunker(t *testing.T) {
	c := NewTextChunker(ChunkingRecursive)
	text := "第一段。\n\n第二段。\n\n第三段。"
	chunks := c.ChunkText(text)

	if len(chunks) == 0 {
		t.Fatal("expected chunks")
	}
}

func TestTokenChunker(t *testing.T) {
	c := NewTextChunker(ChunkingToken)
	text := strings.Repeat("word ", 100)
	chunks := c.ChunkText(text)

	if len(chunks) == 0 {
		t.Fatal("expected chunks")
	}
}

func TestMarkdownChunker(t *testing.T) {
	c := NewTextChunker(ChunkingMarkdown)
	text := "# Title\n\ncontent\n\n## Section 1\n\nsection content"
	chunks := c.ChunkText(text)

	if len(chunks) == 0 {
		t.Fatal("expected chunks")
	}
}

func TestChunkerEmptyInput(t *testing.T) {
	c := NewTextChunker(ChunkingRecursive)
	chunks := c.ChunkText("")
	if len(chunks) != 0 {
		t.Fatalf("expected 0 chunks for empty input, got %d", len(chunks))
	}
}

func TestChunkerManager(t *testing.T) {
	m := NewChunkerManager()
	if m.Chunker("invalid") == nil {
		t.Fatal("expected default chunker for unknown strategy")
	}
}

func TestChunkerManagerSelectStrategy(t *testing.T) {
	m := NewChunkerManager()
	chunks := m.ChunkDocument("# hello", "text/markdown")
	if len(chunks) == 0 {
		t.Fatal("expected chunks for markdown")
	}
}

func TestTextPreprocessor(t *testing.T) {
	p := NewTextPreprocessor()

	cleaned := p.Clean("  hello   world  ")
	if cleaned != "hello world" {
		t.Errorf("expected 'hello world', got %q", cleaned)
	}

	normalized := p.Normalize("你好，世界。")
	if !strings.Contains(normalized, ",") {
		t.Errorf("expected normalized commas")
	}

	sentences := p.SplitSentences("你好。世界！")
	if len(sentences) < 2 {
		t.Errorf("expected multiple sentences, got %d", len(sentences))
	}
}
