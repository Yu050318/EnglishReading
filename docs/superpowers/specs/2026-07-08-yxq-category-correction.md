# yxq 题库分类纠正规格

## 背景

用户在背题模式中发现类别筛选仍显示旧题库分类：

- 新闻英语
- 荒野生存
- 其他

但当前内置题库已经替换为 `yxq英语题库.docx` 的 Vocabulary 题目，不属于新闻英语或荒野生存。

进一步检查发现，当前 `public/questions.json` 中 60 题里有 58 题为 `other`，2 题被旧 `category_for()` 启发式误判为 `news_english`：

- `yxq英语题库.docx#20` 含 `media company`
- `yxq英语题库.docx#40` 含 `journal`

根因是：数据提取仍复用了旧题库的新闻/荒野关键词分类逻辑，UI 也固定展示所有旧分类。

## 目标

- 当前 yxq Vocabulary 题库统一归类为“词汇题库”。
- 背题、练习、收藏、错题、题库管理中题目标签显示“词汇题库”，不再显示“其他”。
- 类别筛选下拉只展示当前题库实际存在的类别；对于当前内置题库，应只显示：
  - 全部类别
  - 词汇题库
- 不再在当前 yxq 内置题库页面展示“新闻英语 / 荒野生存”筛选项。
- 保留旧类别兼容能力：如果用户将来导入旧 JSON，`news_english`、`into_the_wild`、`other` 仍能被识别和显示。

## 非目标

- 不重做题库数据。
- 不改变练习、背题、收藏、错题、题库管理的业务流程。
- 不清理用户本地学习记录。
- 不新增后台、数据库或依赖。

## 产品决策

新增分类值：

- `vocabulary`

显示文案：

- `vocabulary` → `词汇题库`
- `news_english` → `新闻英语`
- `into_the_wild` → `荒野生存`
- `other` → `其他`

当前 `yxq英语题库.docx` 提取结果应全部设置为：

- `category: "vocabulary"`

类别筛选应根据当前可用题目动态生成，而不是固定展示全部枚举。当前可用题目包括内置题库和用户导入/本地覆盖后的题目；如果某个类别没有题目，就不展示该类别选项。

## 验收标准

1. `public/questions.json` 中 60 题全部为 `category: "vocabulary"`。
2. `data/questions.raw.json`、`data/questions.review.json` 与发布数据一致使用 `vocabulary`。
3. `validate:data` 接受 `vocabulary`，并继续接受旧分类值。
4. 背题模式类别下拉在当前内置题库下只显示“全部类别 / 词汇题库”，不显示“新闻英语 / 荒野生存 / 其他”。
5. 练习模式类别下拉同样只显示当前实际存在的类别。
6. 题卡、列表、收藏/错题、题库管理标签显示“词汇题库”。
7. 分类筛选选择“词汇题库”后仍显示 60 题。
8. 题号跳转、题型筛选、答题和背题功能不受影响。
9. 不提交任务外 dirty 文件：`.claude/`、`tsconfig.json`、既有未确认的练习/背题源码改动除非本修正必须触碰并经产品验收。
10. 产品验收通过后提交并推送到现有 GitHub 远端。

## 验证要求

- 新增或更新单元测试，覆盖：
  - yxq 提取分类为 `vocabulary`。
  - schema 校验接受 `vocabulary`。
  - 类别选项从实际题目动态生成，不包含没有题目的旧类别。
- 运行：
  - `npm.cmd run validate:data`
  - `npm.cmd test`
  - `npm.cmd run build`
  - `git diff --check`
- 可用时做浏览器验证：打开 `#/memorize` 和练习设置页，确认下拉选项正确；不可用时说明限制，并用静态 DOM/数据检查替代。
