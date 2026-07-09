# 英语复习题库扩充规格

## 背景

用户提供新文档：

`D:\学习\大二下\英语阅读\英语复习.docx`

希望把文档中的题目和选项加入当前刷题网站，并更新网站中对应分类。

当前网站已经支持两个科目：

- 英语
- 人力资源

本任务只扩充“英语”科目，不影响人力资源题库。

## 文档初步结构

初步读取 `英语复习.docx` 后，内容大致为：

### 第一部分

包含多组词汇/句子填空：

1. 第一组：6 道句子填空题，后面给出 6 个答案短语，例如：
   - `realistic demand`
   - `address the meeting`
   - `growing`
   - `address the question`
   - `address complaints`
   - `public demand`
2. 第二组：6 道二选一题，例如 `(improving / progressing)`，后面给出答案。
3. 第三组：5 道二选一题，例如 `(noticeable, open)`，后面给出答案。

### 第二部分

包含多篇篇章选词填空：

- 每篇先给出 A-O 左右的词库。
- 后面是一段带 `(1)` 至 `(10)` 空格的文章。
- 最后给出答案映射，例如 `1—5 KMOHI`、`6—10 ADJNF`。

## 产品目标

- 将 `英语复习.docx` 中可识别题目加入“英语”科目。
- 不覆盖现有 yxq 英语题库 60 题。
- 不影响“人力资源”科目题库、练习、背题、错题、收藏、云同步。
- 更新英语科目分类：
  - 原 yxq 题库继续归为 `词汇题库`。
  - 新 `英语复习.docx` 题目归为 `英语复习`。
- 如执行时可稳定细分，允许把 `英语复习` 下的 source 或 category 细分为：
  - `英语复习·第一部分`
  - `英语复习·第二部分`
  但前端至少必须能显示“英语复习”这个分类。

## 题型规则

优先使用现有题型，避免过度扩展：

### 第一部分

- 对“二选一”题，生成 `single_choice`：
  - options 为两个候选词。
  - answer 为正确候选对应的选项 key。
  - explanation 可为空。
- 对“句子填空 + 答案短语列表”题：
  - 若每道题能明确对应一个答案短语，则生成 `single_choice`，选项可使用该组全部答案短语。
  - answer 为对应短语。
  - 如果无法稳定对应，不得猜测；放入 `needs_review`，不发布，或按 `short_answer` 展示参考答案。

### 第二部分

- 篇章选词填空建议拆成每个空一题：
  - type：`single_choice`
  - question：包含文章上下文和目标空号，例如 `Passage 1 blank (1)`。
  - options：词库 A-O。
  - answer：答案映射中的字母。
  - source：保留文档名、篇章和空号。
- 如果执行方发现拆分上下文过长或题目体验差，可把每篇作为 `short_answer`，但必须先回报产品部；默认先按“每空一题”实现。

## 数据规则

- subject：全部为 `english`。
- category：新增或使用 `english_review`，显示为 `英语复习`。
- source：
  - `英语复习.docx#part1-...`
  - `英语复习.docx#part2-passage...-blank...`
- ID 必须稳定，并避免与现有 yxq、人力资源题目冲突。
- 旧 yxq 英语题库 ID 尽量不变，避免破坏旧学习记录。
- `needs_review` 题不得发布到 `public/questions.json`。

## 交互要求

- 英语科目分类下拉应显示：
  - `词汇题库`
  - `英语复习`
- 人力资源科目分类不应显示 `英语复习`。
- 首页英语题数更新为旧英语题数 + 新增可发布英语复习题数。
- 练习、背题、错题、收藏、题库管理继续按 subject 和 category 过滤。

## Supabase / Vercel 要求

- 不修改 Supabase schema/RPC/env。
- 云同步只保存题目 ID 与状态；新增题目 ID 必须稳定即可。
- 完成后提交、推送到 GitHub main，并触发/等待 Vercel production 部署。
- 不提交 `.env*`、`.vercel/`、token 或本地配置。

## 验收标准

1. `public/questions.json` 包含原英语 60 题、人力资源 32 题，以及新 `英语复习.docx` 中可发布题目。
2. 现有英语 yxq 60 题仍在，category 仍为 `vocabulary` / 显示 `词汇题库`。
3. 新增英语复习题全部为 `subject: "english"`。
4. 新增英语复习题 category 显示为 `英语复习`。
5. 英语分类下拉包含 `英语复习`，人力资源分类下拉不包含。
6. 第一部分二选一题至少能被正确提取并判分。
7. 第二部分篇章选词填空能保留词库、空号和答案。
8. 无法可靠解析的题不得自动猜答案。
9. `validate:data`、测试、构建通过。
10. 线上 production URL 更新后可访问，`questions.json` 题数增加，subjects 仍包含 `english` 和 `human_resources`。

## 验证要求

- 新增/更新提取测试，至少覆盖：
  - 第一部分二选一题。
  - 第一部分句子填空题。
  - 第二部分词库和答案映射。
- 新增/更新分类测试，确保 `english_review` 显示为 `英语复习`。
- 本地验证：
  - `npm.cmd run validate:data`
  - `npm.cmd test`
  - `npm.cmd run build`
  - `git diff --check`
- 浏览器验证可用时：
  - 英语科目分类下拉出现 `英语复习`。
  - 人力资源科目不出现 `英语复习`。
  - 英语复习题可进入背题/练习。
- 线上验证：
  - production URL 200。
  - `/questions.json` 200，题数增加。
  - 英语科目能看到 `英语复习` 分类。
