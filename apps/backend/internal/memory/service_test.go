package memory

import (
	"testing"

	"interview-demo/backend/internal/model"
)

func TestAddAndGetHistory(t *testing.T) {
	s := NewService()

	s.Add("conv1", model.Message{Role: "user", Content: "hello"})
	s.Add("conv1", model.Message{Role: "assistant", Content: "hi"})

	history := s.History("conv1", 10)
	if len(history) != 2 {
		t.Fatalf("expected 2 memories, got %d", len(history))
	}
	if history[0].Role != "assistant" {
		t.Errorf("expected first to be assistant (latest first), got %s", history[0].Role)
	}
}

func TestGetHistoryLimit(t *testing.T) {
	s := NewService()
	for i := 0; i < 10; i++ {
		s.Add("conv2", model.Message{Role: "user", Content: "msg"})
	}

	history := s.History("conv2", 3)
	if len(history) != 3 {
		t.Fatalf("expected 3 memories, got %d", len(history))
	}
}

func TestGetHistoryNonexistent(t *testing.T) {
	s := NewService()
	history := s.History("nonexistent", 10)
	if len(history) != 0 {
		t.Fatalf("expected 0 memories, got %d", len(history))
	}
}

func TestClear(t *testing.T) {
	s := NewService()
	s.Add("conv3", model.Message{Role: "user", Content: "msg"})
	s.Clear("conv3")

	history := s.History("conv3", 10)
	if len(history) != 0 {
		t.Fatalf("expected 0 memories after clear")
	}
}

func TestSearch(t *testing.T) {
	s := NewService()
	s.Add("conv4", model.Message{Role: "user", Content: "今天天气怎么样"})
	s.Add("conv4", model.Message{Role: "user", Content: "帮我定个闹钟"})

	results := s.Search("conv4", "天气", 5)
	if len(results) == 0 {
		t.Fatal("expected search results for '天气'")
	}
	found := false
	for _, r := range results {
		if r.Role == "user" {
			found = true
			break
		}
	}
	if !found {
		t.Error("search result should contain matching memory")
	}
}

func TestSearchNoMatch(t *testing.T) {
	s := NewService()
	s.Add("conv5", model.Message{Role: "user", Content: "hello world"})

	results := s.Search("conv5", "zzzzz", 5)
	if len(results) != 0 {
		t.Fatalf("expected 0 results, got %d", len(results))
	}
}

func TestCalculateImportance(t *testing.T) {
	s := NewService()

	normal := s.Add("imp", model.Message{Role: "user", Content: "hello"})
	if normal.Importance < 0.4 || normal.Importance > 0.6 {
		t.Errorf("expected importance ~0.5, got %f", normal.Importance)
	}

	important := s.Add("imp", model.Message{Role: "user", Content: "请记住这个重要信息"})
	if important.Importance <= normal.Importance {
		t.Errorf("expected higher importance for important content, got %f", important.Importance)
	}
}

func TestSummarize(t *testing.T) {
	s := NewService()
	summary := s.Summarize("nonexistent")
	if summary != "暂无对话历史" {
		t.Errorf("expected '暂无对话历史', got %s", summary)
	}

	s.Add("summ", model.Message{Role: "user", Content: "第一条消息"})
	s.Add("summ", model.Message{Role: "user", Content: "第二条消息"})
	summary = s.Summarize("summ")
	if summary == "" || summary == "暂无对话历史" {
		t.Errorf("expected non-empty summary")
	}
}
