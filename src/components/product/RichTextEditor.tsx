import React, { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

export const RichTextEditor: React.FC<{
  editor: React.RefObject<HTMLDivElement | null>;
  value?: string;
  htmlValue?: string;
  onInput: (text: string, html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}> = ({ editor, value = "", htmlValue = "", onInput, onBlur, placeholder = "请输入内容，支持文字排版、列表和链接..." }) => {
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    if (!editor.current) return;
    const next = htmlValue || value;
    if (next && editor.current.innerHTML !== next && document.activeElement !== editor.current) {
      editor.current.innerHTML = htmlValue || value.replace(/\n/g, "<br>");
    }
  }, [editor, htmlValue, value]);

  const emitInput = () => onInput(editor.current?.innerText || "", editor.current?.innerHTML || "");
  const command = (name: string, commandValue?: string) => {
    editor.current?.focus();
    document.execCommand(name, false, commandValue);
    emitInput();
  };
  const buttons: Array<{ label: string; icon: React.ReactNode; command: string; value?: string }> = [
    { label: "撤销", icon: <Undo2 className="h-4 w-4" />, command: "undo" },
    { label: "重做", icon: <Redo2 className="h-4 w-4" />, command: "redo" },
    { label: "粗体", icon: <Bold className="h-4 w-4" />, command: "bold" },
    { label: "斜体", icon: <Italic className="h-4 w-4" />, command: "italic" },
    { label: "下划线", icon: <Underline className="h-4 w-4" />, command: "underline" },
    { label: "删除线", icon: <Strikethrough className="h-4 w-4" />, command: "strikeThrough" },
    { label: "项目符号", icon: <List className="h-4 w-4" />, command: "insertUnorderedList" },
    { label: "编号列表", icon: <ListOrdered className="h-4 w-4" />, command: "insertOrderedList" },
    { label: "左对齐", icon: <AlignLeft className="h-4 w-4" />, command: "justifyLeft" },
    { label: "居中", icon: <AlignCenter className="h-4 w-4" />, command: "justifyCenter" },
    { label: "右对齐", icon: <AlignRight className="h-4 w-4" />, command: "justifyRight" },
  ];
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const item = Array.from(event.clipboardData.items as DataTransferItem[]).find((entry) => entry.type.startsWith("image/"));
    if (!item) return;
    event.preventDefault();
    const file = item.getAsFile();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => command("insertImage", String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-main)] px-2 py-1">
        {buttons.map((item) => <button key={item.label} type="button" title={item.label} aria-label={item.label} onMouseDown={(event) => event.preventDefault()} onClick={() => command(item.command, item.value)} className="inline-flex h-8 w-8 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)]">{item.icon}</button>)}
        <div className="ml-1 flex items-center rounded border border-[var(--border-main)]">
          <Link className="ml-2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input aria-label="链接地址" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://" className="h-7 w-28 bg-transparent px-2 text-xs text-[var(--text-primary)] outline-none" />
          <button type="button" disabled={!linkUrl.trim()} onMouseDown={(event) => event.preventDefault()} onClick={() => { command("createLink", linkUrl.trim()); setLinkUrl(""); }} className="h-7 border-l border-[var(--border-main)] px-2 text-xs text-[var(--active-text)] disabled:opacity-40">插入</button>
        </div>
      </div>
      <div ref={editor} contentEditable role="textbox" aria-multiline="true" suppressContentEditableWarning onPaste={handlePaste} onInput={emitInput} onBlur={onBlur} className="min-h-80 p-4 text-sm leading-6 text-[var(--text-primary)] outline-none empty:before:pointer-events-none empty:before:text-[var(--text-muted)] empty:before:content-[attr(data-placeholder)]" data-placeholder={placeholder} />
    </div>
  );
};
