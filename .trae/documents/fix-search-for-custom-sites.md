# 修复自定义网站无法检索的计划

## 1. 现状分析 (Current State Analysis)
在当前版本的 `src/main/index.ts` 中，`scrapeSite` 函数用于执行影视检索。但是，在执行基于 DOM 的页面解析时，代码里存在一个硬编码的白名单判断：
```typescript
if (url.includes('pdy') || url.includes('czzy') || url.includes('zxzj') || url.includes('libvio') || url.includes('nfmovies') || url.includes('pianku') || url.includes('ddys')) {
    $('.module-item, .mac_vod_list li, .stui-vodlist__item...').each(...)
}
```
这导致如果用户添加了白名单之外的任何自定义影视网站（比如 `zhenbuka`, `555dy` 等），程序会直接跳过这部分强大且通用的解析逻辑，从而无法提取到任何搜索结果。这就是“添加的其他网站都无法检索到任何信息”这个严重 Bug 的根源。

## 2. 拟修改内容 (Proposed Changes)
- **文件**: `src/main/index.ts`
- **操作**: 
  - 定位到 `scrapeSite` 函数中的 DOM 解析阶段（约 135 行附近）。
  - **移除**上述限制特定网站域名的 `if` 包装代码块，使得通用解析器（`cheerio` 提取器）对**所有**传入的网站 URL 都生效。
  - 调整代码的缩进以保持格式规范。

## 3. 假设与决策 (Assumptions & Decisions)
- 现有的 CSS 选择器 (`.module-item, .mac_vod_list li, .stui-vodlist__item` 等) 已经覆盖了市面上绝大多数基于 MacCMS / AppleCMS 搭建的影视网站模板，所以解除白名单限制后，绝大部分用户自定义网站都能直接被正确解析出结果。
- 对于极少数特殊结构的网站，解除限制也不会产生副作用，因为后续原本就有一层极为基础的兜底解析机制（基于 `<a>` 标签包裹 `<img>` 的简单提取）。

## 4. 验证步骤 (Verification Steps)
1. 移除限制逻辑后执行 `npm run build:mac` 并重新打包签名。
2. 运行应用，添加一个不在原本白名单内的影视站点（例如 `https://www.zhenbuka.com`）。
3. 切换至“发现影视”或使用搜索框进行检索。
4. 验证程序能否成功返回该自定义网站中的影视搜索结果。