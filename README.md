# 阅见 · 英语阅读刷题网站

个人使用的 React + Vite 静态刷题站。题库来自上级目录中的三次测试 DOCX；原始资料不会被修改。

## 开发与验证

```bash
npm install
npm run convert
npm test
npm run build
npm run dev
```

访问 Vite 输出的本地地址。站点使用 `HashRouter`，可直接部署到静态托管。

## Windows 一键启动

双击项目根目录的 `启动网站.bat`。首次运行会自动安装依赖，随后浏览器会打开 `http://localhost:5173`。

停止网站：在启动窗口按 `Ctrl+C`，或直接关闭窗口。

### 手机访问

1. 手机与电脑连接同一 Wi-Fi。
2. 双击 `启动网站.bat`。
3. 在手机浏览器打开启动窗口中 Vite 显示的 `Network` 地址，例如 `http://192.168.1.8:5173`。
4. Windows 防火墙首次询问时，允许 Node.js 使用专用网络。

手机不能使用 `localhost:5173`，因为手机上的 `localhost` 指向手机本身。

## 部署

- Vercel：导入仓库，Framework 选 Vite，Build Command 为 `npm run build`，Output Directory 为 `dist`。
- GitHub Pages：构建后发布 `dist/`。Hash 路由不会因刷新产生 404；若仓库不是自定义域名，请在 Vite 中设置相应 `base` 或使用 Pages Actions。

## 题库更新

将源 DOCX/OCR 放在项目上级既定位置，运行 `npm run convert`。转换报告位于 `data/conversion-report.json`；只有完整且 `verified` 的题目进入 `public/questions.json`。

## 备份与恢复

题库管理页可导出合并后的题库、进度和孤立记录。导入前会预览新增、更新和无效数量。“恢复内置题库”只清除本地题目覆盖与导入题，不清除进度、错题或收藏。浏览器数据键前缀为 `english-reading-quiz:v1:`。
