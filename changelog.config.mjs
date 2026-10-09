import createConventionalCommitsPreset from 'conventional-changelog-conventionalcommits'

// conventional-changelog v8 起不再读取 .versionrc.json，改用 `-n` 指定 config script。
//
// preset 默认把 docs / refactor / style / chore / test / build / ci 标记为 effect: 'hidden'，
// 这些提交不会写入 CHANGELOG。这里放开它们：effect: 'none' = 写入 CHANGELOG，但不触发版本 bump
// （isTypeEffect 只对 effect === 'hidden' 丢弃，'bump' 才影响版本号计算）。
const types = [
  { type: 'feat', section: 'Features', effect: 'bump' },
  { type: 'feature', section: 'Features', effect: 'bump' },
  { type: 'fix', section: 'Bug Fixes', effect: 'bump' },
  { type: 'perf', section: 'Performance Improvements', effect: 'bump' },
  { type: 'revert', section: 'Reverts', effect: 'bump' },
  { type: 'docs', section: 'Documentation', effect: 'none' },
  { type: 'refactor', section: 'Code Refactoring', effect: 'none' },
  { type: 'style', section: 'Styles', effect: 'none' },
  { type: 'test', section: 'Tests', effect: 'none' },
  { type: 'build', section: 'Build System', effect: 'none' },
  { type: 'ci', section: 'Continuous Integration', effect: 'none' },
  { type: 'chore', section: 'Miscellaneous Chores', effect: 'none' }
]

export default createConventionalCommitsPreset({ types })
