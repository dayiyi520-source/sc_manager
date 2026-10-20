import { Typography } from 'antd';

/** The same preview length and full-content tooltip are used on cards and complete lists. */
export function FeedSummary({ content }: { content: string }) {
  return <Typography.Paragraph className="workbench-feed-summary" ellipsis={{ rows: 3, tooltip: { title: <span className="block max-h-80 overflow-y-auto whitespace-pre-wrap break-words">{content}</span> } }}>{content}</Typography.Paragraph>;
}
