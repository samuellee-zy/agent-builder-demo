# Plan: Report Formatter Tool

**Goal**: Convert raw markdown reports into human-friendly, rich-text UI cards.

## Proposed Changes

### 1. [NEW] `publish_report` Tool
- **File**: `src/services/tools.ts`
- **Function**: `publish_report(title, content, summary)`
- **Purpose**: Allows agents to explicitly "publish" a structured report rather than just streaming text.
- **Behavior**: Returns a success message to the agent, but triggers a UI event to render a "Report Card".

### 2. [MODIFY] `src/components/AgentBuilder.tsx`
- **Report Card UI**:
  - Detects `publish_report` tool calls in the chat stream.
  - Renders a distinct, styled card (e.g., `bg-slate-800`, border, shadow).
  - **Markdown Rendering**:
    - **Install**: `react-markdown` and `remark-gfm` (for tables/strikethrough).
    - **Features**:
      - **Rich Text**: Bold (`**`), Italics (`*`), Strikethrough (`~~`).
      - **Structure**: Headers (`#`), Lists (Ordered/Unordered), Blockquotes (`>`).
      - **Code**: Syntax highlighting for code blocks (` ``` `) and inline code (` ` `).
      - **Tables**: Full GFM table support.
    - **Styling**: Use `prose` (Tailwind Typography) or custom styles to ensure it looks like a professional document.

### 3. [MODIFY] `src/components/ToolsLibrary.tsx`
- **Mock Tester UI**:
  - Import `react-markdown` and `remark-gfm`.
  - In `renderToolInspector`, check if `selectedTool.id === 'publish_report'`.
  - If yes, parse the `executionResult` JSON.
  - Render the "Report Card" UI (Title, Summary, Markdown Content) instead of the raw JSON block.

## Verification Plan
1. **Create Test Agent**: Build a "Market Researcher" agent with `publish_report` tool.
2. **Execute Task**: Ask "Generate a market report on AI trends".
3. **Verify UI**: Ensure the output appears as a styled Card, not a raw text block.
4. **Verify Formatting**: Check that headers and lists are rendered correctly.
