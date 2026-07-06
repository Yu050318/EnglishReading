# Windows 启动脚本兼容性修复设计

## 根因

当前 `启动网站.bat` 使用 UTF-8 无 BOM、LF 换行，并包含中文命令文本。Windows `cmd.exe` 实测将多字节中文和后续参数拆成独立命令，产生 `9009`，因此脚本无法可靠启动。

## 修复方案

- 保留文件名 `启动网站.bat`，但文件内容只使用 ASCII 字符。
- 删除 `chcp 65001` 和批处理中的中文标题、提示及省略号。
- 错误与使用说明改用简洁英文；完整中文说明继续保留在 README。
- 新增 `.gitattributes`：`*.bat text eol=crlf`，确保 Windows 检出时使用 CRLF。
- 保留原有功能：目录自定位、Node/npm/package.json 检查、按需安装依赖、固定 5173、严格端口、延迟打开浏览器、局域网监听和退出码。

## 验收标准

1. `启动网站.bat` 内容不包含任何非 ASCII 字节。
2. `.gitattributes` 明确强制 `.bat` 使用 CRLF。
3. 使用隔离 PATH 运行脚本时，能按预期进入 Node 缺失分支并返回 1，不再出现“is not recognized”碎片命令。
4. 正常环境运行脚本后，首页和 `questions.json` 均返回 HTTP 200。
5. 第二实例在 5173 被占用时直接失败，不切换端口。
6. 测试创建的进程必须清理，最终 5173 端口为空闲。
7. 不修改或提交当前工作区中的其他未提交源码、`tsconfig.json` 或 `.claude/`。

