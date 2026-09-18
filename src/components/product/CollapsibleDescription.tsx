import React, { useLayoutEffect, useRef, useState } from 'react';

type Props = { value?: string | null; emptyText?: string };

export const CollapsibleDescription: React.FC<Props> = ({ value, emptyText = '未填写描述' }) => {
  const text = value?.trim() || emptyText;
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const measure = () => {
      const node = ref.current;
      if (node) setOverflow(node.scrollHeight > node.clientHeight + 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text, expanded]);
  return <div className="collapsible-description-wrap">
    <p ref={ref} className={`collapsible-description${expanded ? ' is-expanded' : ''}`}>{text}</p>
    {overflow && !expanded && <button type="button" className="collapsible-description-toggle" onClick={() => setExpanded(true)}>显示全部</button>}
  </div>;
};
