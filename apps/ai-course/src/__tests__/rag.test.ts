import { describe, expect, it } from 'vitest';
import { addDocument, buildContext, chunkDocument, search } from '../../server/rag.ts';

describe('chunkDocument', () => {
  it('短文本只产生一个块', () => {
    expect(chunkDocument('一句话').length).toBe(1);
  });

  it('长文本会被切成多块', () => {
    const text = Array.from({ length: 20 }, (_, i) => `第${i}段`.repeat(50)).join('\n');
    expect(chunkDocument(text, 200, 40).length).toBeGreaterThan(1);
  });
});

describe('search', () => {
  it('空库返回空结果', () => {
    expect(search('任何问题').length).toBe(0);
  });

  it('能召回相关块并给出分数', () => {
    addDocument('报销制度', '差旅报销需要在出发前提交申请，并在返回后 7 个工作日内提交发票。');
    addDocument('请假制度', '年假需提前 3 天在系统中提交，由直属主管审批。');

    const hits = search('报销需要什么材料', 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].text).toContain('报销');
    expect(hits[0].score).toBeGreaterThan(0);
  });

  it('上下文带序号与分数，便于引用', () => {
    const hits = search('请假', 1);
    if (hits.length === 0) return;
    const context = buildContext(hits);
    expect(context).toMatch(/^\[1\] \(score=/);
  });
});
