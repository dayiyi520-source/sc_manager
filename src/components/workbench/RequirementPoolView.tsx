import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dropdown, Input, Rate, Select } from "antd";
import { openWorkItemDetailLink, workItemDetailLink } from '../../utils/workItemDetailLink';
import { loadCollaborationRelatedTasks } from '../../services/collaborationRelatedTasks';
import { workOrderDisplayName } from '../../utils/workOrderDisplay';
import { WorkOrderDiscussion } from './WorkOrderDiscussion';
import { DetailCopyButton } from '../common/DetailCopyButton';
import {
  Inbox,
  Search,
  Plus,
  User,
  CheckCircle2,
  Clock,
  MessageCircle,
  Sparkles,
  Paperclip,
  ArrowRight,
  X,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
} from "../common/octicons-compat";
import { Pagination } from "../common/Pagination";
import { useApp } from "../../context/AppContext";
import { StatusTag, Drawer, Modal } from "../common/UIComponents";
import { normalizeRequirementTask, requirementRepository } from "../../services/requirementRepository";
import { LazyRichTextEditor as RichTextEditor } from "../product/LazyRichTextEditor";
import { RequirementTasksView } from "../product/RequirementTasksView";
import type {
  EmployeeOption,
  RequirementEvent,
  RequirementMedia,
  RequirementTask,
  RequirementTaskType,
  RequirementWorkItem,
  WorkOrderType,
  AttachmentMetadata,
} from "../../types";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { getRejectReasonsForType } from "../../constants/rejectReasons";
import { TASK_PAGE_BY_TYPE } from "../../constants/taskTypes";
import { DateField } from "../common";
import { copyToClipboard } from '../../utils/copyToClipboard';
import { employeeSelectOptions } from "../common/PersonIdentity";
import { isWorkOrderInScope, ownerDepartment, REQUIREMENT_SCOPES, type RequirementScope } from './requirementScope';
import { WorkItemCategoryIcon } from '../product/WorkItemCategoryIcon';
export { isWorkOrderInScope } from './requirementScope';

const statuses: RequirementTask["status"][] = [
  "待处理",
  "处理中",
  "待验收",
  "已完成",
  "已退回",
];
const taskTypes: RequirementTaskType[] = [
  "产品需求",
  "缺陷管理",
  "设计任务",
  "研发任务",
];
const severityPriorities: Record<string, RequirementTask["priority"]> = {
  "阻断主流程": "紧急",
  "功能逻辑异常": "高",
  "一般缺陷": "中",
  "轻微缺陷": "低",
};
const taskTargetPages: Record<RequirementTaskType, string> = TASK_PAGE_BY_TYPE;
const taskIconCategory = (taskType?: string) => taskType === '设计任务' ? 'design' : taskType === '研发任务' ? 'dev' : taskType === '缺陷管理' ? 'bug' : taskType === '测试任务' ? 'test' : 'requirement';
const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date).replace(/\//g, "-");
};
const workOrderTypes: WorkOrderType[] = ["客户诉求", "线上问题", "售前支持", "交付支持", "其他问题"];
const workOrderProjectName = (item: RequirementTask) => {
  const specialFields = item.specialFields && typeof item.specialFields === "object" && !Array.isArray(item.specialFields)
    ? item.specialFields
    : {};
  return item.projectName || String(specialFields.projectName || "");
};



const normalizeMedia = (value: unknown): RequirementMedia[] => {
  if (Array.isArray(value)) return value as RequirementMedia[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as RequirementMedia[]) : [];
  } catch {
    return [];
  }
};

const samePerson = (value: string | undefined, currentUserName: string) =>
  Boolean(value?.trim()) && value.trim().toLocaleLowerCase() === currentUserName.trim().toLocaleLowerCase();

const isInitiator = (task: RequirementTask, currentUser: { id: string; name: string }) =>
  Boolean(task.creatorId && currentUser.id && task.creatorId === currentUser.id) || samePerson(task.creatorName, currentUser.name);

const eventMetadata = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {}; } catch { return {}; }
};

const eventAttachments = (metadata: Record<string, unknown>): RequirementMedia[] => {
  const value = metadata.attachments ?? metadata.media;
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const name = String(source.name || source.fileName || "附件");
    const mimeType = String(source.mimeType || source.type || "");
    const dataUrl = String(source.dataUrl || source.url || source.downloadUrl || (source.id ? `/api/attachments/${String(source.id)}/download` : ""));
    const type: RequirementMedia["type"] = mimeType.startsWith("image/") || String(source.type) === "image" ? "image" : mimeType.startsWith("video/") || String(source.type) === "video" ? "video" : "file";
    return [{ id: String(source.id || name), name, type, dataUrl, size: typeof source.size === "number" ? source.size : undefined, mimeType }];
  });
};

export const eventOperatorLabel = (event: RequirementEvent, metadata: Record<string, unknown>) => {
  const operator = `操作人：${event.operatorName || "未知"}`;
  const assignee = String(metadata.assigneeName || "").trim();
  const fromAssignee = String(metadata.fromAssigneeName || "").trim();
  const ownerChanged = metadata.ownerChanged === true || (Boolean(assignee) && Boolean(fromAssignee) && assignee !== fromAssignee);
  return ownerChanged && assignee ? `${operator} · 负责人指派为：${assignee}` : operator;
};

const FlowAttachmentPicker: React.FC<{ media: RequirementMedia[]; onChange: React.Dispatch<React.SetStateAction<RequirementMedia[]>>; onPick: (event: React.ChangeEvent<HTMLInputElement>) => void }> = ({ media, onChange, onPick }) => (
  <div className="space-y-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-[var(--text-body)]">附件</span>
      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border-main)] px-2 py-1 text-xs text-[var(--active-text)] hover:bg-[var(--bg-hover)]">
        <Paperclip className="h-3.5 w-3.5" /> 添加附件
        <input type="file" multiple className="sr-only" onChange={onPick} />
      </label>
    </div>
    {media.length ? <div className="flex flex-wrap gap-2">{media.map((item) => <span key={item.id} className="inline-flex items-center gap-1 rounded border border-[var(--border-main)] px-2 py-1 text-xs text-[var(--text-body)]">{item.name}<button type="button" aria-label={`移除${item.name}`} onClick={() => onChange((items) => items.filter((candidate) => candidate.id !== item.id))}><X className="h-3 w-3" /></button></span>)}</div> : <span className="text-[11px] text-[var(--text-muted)]">可上传图片、文档或其他处理材料</span>}
  </div>
);

type AssistanceSubTask = {
  taskType: RequirementTaskType | "";
  assignee: string;
  expectedDueDate: string;
  note: string;
  media: RequirementMedia[];
};


const toSelectOptions = (options: string[]) => Array.from(new Set(options.filter(Boolean))).map((item) => ({ label: item, value: item }));

const SearchSelect: React.FC<{ label: string; value: string; options: string[]; placeholder?: string; onChange: (value: string) => void }> = ({ label, value, options, placeholder, onChange }) => (
  <label className="work-order-field text-xs text-[var(--text-muted)]">
    {label}
    <Select
      aria-label={label}
      allowClear
      className="w-full"
      showSearch
      optionFilterProp="label"
      options={toSelectOptions(options)}
      placeholder={placeholder}
      size="middle"
      value={value || undefined}
      onChange={(nextValue) => onChange(nextValue ?? "")}
    />
  </label>
);

const EmployeeSearchSelect: React.FC<{ label: string; value: string; employees: EmployeeOption[]; placeholder?: string; onChange: (value: string) => void }> = ({ label, value, employees, placeholder, onChange }) => (
  <label className="work-order-field text-xs text-[var(--text-muted)]">
    {label}
    <Select
      aria-label={label}
      allowClear
      className="w-full"
      showSearch
      optionFilterProp="label"
      options={employeeSelectOptions(employees, 'name')}
      placeholder={placeholder}
      size="middle"
      value={value || undefined}
      onChange={(nextValue) => onChange(nextValue ?? "")}
    />
  </label>
);

const WorkOrderSelect: React.FC<{ label: string; value: string; options: string[]; placeholder: string; disabled?: boolean; onChange: (value: string) => void }> = ({ label, value, options, placeholder, disabled, onChange }) => (
  <label className="work-order-field text-xs text-[var(--text-muted)]">
    {label}
    <Select
      aria-label={label}
      allowClear
      disabled={disabled}
      className="w-full"
      options={toSelectOptions(options)}
      placeholder={placeholder}
      size="middle"
      value={value || undefined}
      onChange={(nextValue) => onChange(nextValue ?? "")}
    />
  </label>
);

const WorkOrderInput: React.FC<{ label: string; value: string; placeholder: string; onChange: (value: string) => void }> = ({ label, value, placeholder, onChange }) => (
  <label className="work-order-field text-xs text-[var(--text-muted)]">
    {label}
    <Input aria-label={label} className="w-full" placeholder={placeholder} size="middle" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);



export const RequirementPoolView: React.FC = () => {
  const [detailSearch] = useState(() => window.location.search);
  const {
    requirementTasks,
    addRequirementTask,
    setRequirementTasks,
    productLines,
    customers,
    biddings,
    opportunities,
    currentUser,
    addToast,
    openPageTab,
  } = useApp();
  const [creating, setCreating] = useState(false);
  const [workOrderType, setWorkOrderType] = useState<WorkOrderType | null>(null);
  const [selected, setSelected] = useState<RequirementTask | null>(null);
  const [taskCreationKind, setTaskCreationKind] = useState<'requirement' | 'design' | 'bug' | 'presales' | 'delivery' | null>(null);
  const [receiving, setReceiving] = useState(false);
  const receiveInFlight = useRef(false);
  const [events, setEvents] = useState<RequirementEvent[]>([]);
  const [workItems, setWorkItems] = useState<RequirementWorkItem[]>([]);
  const [relatedTasks, setRelatedTasks] = useState<{ items: RequirementWorkItem[]; indirectIds: Set<string> } | null>(null);
  const relationProductLineIds = productLines.map((item) => item.id).sort().join(',');
  useEffect(() => {
    setRelatedTasks(null);
    if (!selected || !relationProductLineIds) return;
    let active = true;
    const refresh = () => {
      loadCollaborationRelatedTasks(selected.id, workItems, relationProductLineIds.split(','))
        .then((result) => { if (active) setRelatedTasks(result); })
        .catch((error) => { if (active) addToast('error', '关联任务加载失败', error instanceof Error ? error.message : '请刷新后重试'); });
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('product-task-created', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); window.removeEventListener('product-task-created', refresh); };
  }, [selected?.id, workItems, relationProductLineIds]);
  const displayedWorkItems = relatedTasks?.items || workItems;

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [scope, setScope] = useState<RequirementScope>('mine_created');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [scopeItems, setScopeItems] = useState<RequirementTask[] | null>(null);
  const [transferredIds, setTransferredIds] = useState<Set<string>>(new Set());
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeError, setScopeError] = useState('');
  const [scopeReload, setScopeReload] = useState(0);
  const [organizationEmployees, setOrganizationEmployees] = useState<EmployeeOption[]>([]);
  const listItems = scopeItems || requirementTasks;
  useEffect(() => {
    let active = true;
    setScopeLoading(true);
    setScopeError('');
    Promise.all([requirementRepository.allForScope(), requirementRepository.transferredBy(currentUser.name), requirementRepository.employees()])
      .then(([items, ids, people]) => { if (active) { setScopeItems(items); setTransferredIds(ids); setOrganizationEmployees(people); } })
      .catch((error) => { if (active) { setScopeItems([]); setOrganizationEmployees([]); setTransferredIds(new Set()); setScopeError(error instanceof Error ? error.message : '事项范围加载失败'); } })
      .finally(() => { if (active) setScopeLoading(false); });
    return () => { active = false; };
  }, [currentUser.name, currentUser.id, requirementTasks, scopeReload]);
  const [typeFilter, setTypeFilter] = useState<WorkOrderType | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [title, setTitle] = useState("");
  const [productLineId, setProductLineId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [requirementPriority, setRequirementPriority] = useState<
    RequirementTask["priority"] | ""
  >("中");
  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [media, setMedia] = useState<RequirementMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workflowSubmitting, setWorkflowSubmitting] = useState(false);
  const productDescriptionEditor = useRef<HTMLDivElement>(null);
  const [specialFields, setSpecialFields] = useState<Record<string, string>>({});
  const [workOpen, setWorkOpen] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<"" | "convert" | "reassign" | "memo">("");
  const [subTasks, setSubTasks] = useState<AssistanceSubTask[]>([{ taskType: "", assignee: "", expectedDueDate: "", note: "", media: [] }]);
  const [reassignAssignee, setReassignAssignee] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [memoContent, setMemoContent] = useState("");
  const [flowMedia, setFlowMedia] = useState<RequirementMedia[]>([]);
  const [reasonType, setReasonType] = useState<"hold" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeNote, setCompleteNote] = useState("");
  const [completeNoteHtml, setCompleteNoteHtml] = useState("");
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const commentMatterId = useRef(selected?.id);
  commentMatterId.current = selected?.id;
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [commentTargetId, setCommentTargetId] = useState("");
  useEffect(() => { setCommentsModalOpen(false); setCommentTargetId(""); }, [selected?.id]);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [acceptanceRating, setAcceptanceRating] = useState(0);
  const [acceptanceComment, setAcceptanceComment] = useState("");
  const taskListRef = useRef<HTMLDivElement>(null);
  const [taskListHeight, setTaskListHeight] = useState<number>();
  useEffect(() => {
    const list = taskListRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const cards = Array.from(list.children).slice(0, 3) as Element[];
    const measure = () => setTaskListHeight(cards.reduce((height, card) => height + card.getBoundingClientRect().height, 0) + Math.max(0, cards.length - 1) * 8);
    measure();
    const observer = new ResizeObserver(measure);
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [selected?.id, displayedWorkItems]);
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);
  const [acceptanceReason, setAcceptanceReason] = useState("");
  const [acceptanceWorkItemId, setAcceptanceWorkItemId] = useState("");
  const [acceptanceTaskOwnerId, setAcceptanceTaskOwnerId] = useState("");
  const [acceptanceSubmitting, setAcceptanceSubmitting] = useState(false);
  const [rejectCategory, setRejectCategory] = useState("");
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenAssigneeId, setReopenAssigneeId] = useState('');
  const [reopenReason, setReopenReason] = useState("");
  const [reopenSubmitting, setReopenSubmitting] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const completeEditor = useRef<HTMLDivElement>(null);
  const ownerManuallyChanged = useRef(false);

  useEffect(() => {
    const assistanceSearch = sessionStorage.getItem("shichuang.assistance.search");
    if (!assistanceSearch) return;
    setQuery(assistanceSearch);
    sessionStorage.removeItem("shichuang.assistance.search");
  }, []);

  const currentWorkOrderType = selected?.workOrderType || selected?.taskType || selected?.requirementType || "通用/其他";
  const selectedProject = biddings.find((item) => (item.projectName || item.name) === specialFields.projectName);
  const selectedRelatedOpportunity = opportunities.find((item) => item.id === (workOrderType === "售前支持" ? specialFields.opportunityId : selectedProject?.opportunityId));
  const relatedProducts = [selectedRelatedOpportunity?.relatedProduct || ""];
  const hasProductSource = workOrderType === "售前支持" ? Boolean(selectedRelatedOpportunity) : Boolean(selectedProject);
  const availableProductLines = hasProductSource ? productLines.filter((line) => relatedProducts.some((value) => value === line.id || value === line.name || line.products?.some((item) => item.id === value || item.name === value))) : [];
  const creationProduct = availableProductLines.find((line) => line.id === productLineId);
  const primaryOwnerId = creationProduct?.requirementOwnerUserId;
  const primaryOwnerName = creationProduct?.requirementOwner;
  const changeCreationProduct = (id: string) => {
    ownerManuallyChanged.current = false;
    setOwnerName(workOrderType === "客户诉求" && specialFields.transferToProduct === "不需要" ? currentUser.name : "");
    setProductLineId(id);
  };
  useEffect(() => {
    if (ownerManuallyChanged.current) return;
    if (workOrderType === "客户诉求" && specialFields.transferToProduct === "不需要") { setOwnerName(currentUser.name); return; }
    if (!productLineId) return;
    const primaryOwner = employees.find((employee) => primaryOwnerId
      ? employee.id === primaryOwnerId
      : Boolean(primaryOwnerName) && employee.name === primaryOwnerName);
    setOwnerName(primaryOwner?.name || "");
  }, [productLineId, primaryOwnerId, primaryOwnerName, employees, workOrderType, specialFields.transferToProduct, currentUser.name]);
  const availableRejectReasons = useMemo(() => getRejectReasonsForType(currentWorkOrderType), [currentWorkOrderType]);

  useEffect(() => {
    if (reasonType === "reject") {
      setRejectCategory("");
    }
  }, [reasonType]);

  useEffect(() => {
    requirementRepository
      .employees()
      .then((items) => setEmployees(items.length ? items : fallbackEmployees()))
      .catch(() => setEmployees(fallbackEmployees()));
  }, [requirementTasks, currentUser]);
  const fallbackEmployees = () =>
    Array.from(
      new Set([
        currentUser.name,
        ...requirementTasks.map((item) => item.ownerName).filter(Boolean),
      ]),
    ).map((name) => ({ id: name, name, department: currentUser.department }));
  const reset = () => {
    setTitle("");
    setProductLineId("");
    setOwnerName("");
    ownerManuallyChanged.current = false;
    setRequirementPriority("中");
    setCustomerId("");
    setCustomerQuery("");
    setDueDate("");
    setDescription("");
    setDescriptionHtml("");
    setMedia([]);
    setSpecialFields({});
    setFlowMedia([]);
  };
  const openCreate = (type?: WorkOrderType) => {
    reset();
    setWorkOrderType(type || null);
    setCreating(true);
  };
  const onMedia = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    const allowed = new Set(["text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/pdf"]);
    files
      .filter((file) => allowed.has(file.type) || /\.(txt|doc|docx|xls|xlsx|pdf)$/i.test(file.name))
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () =>
          setMedia((items) => [
            ...items,
            {
              id: `${file.name}-${file.lastModified}`,
              name: file.name,
              type: "file",
              dataUrl: String(reader.result),
              size: file.size,
              mimeType: file.type,
            },
          ]);
        reader.readAsDataURL(file);
      });
    event.target.value = "";
  };
  const stageFlowFiles = async (files: File[]) => {
    const stagedMedia: RequirementMedia[] = [];
    for (const file of files) {
      const localId = `flow-${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error ?? new Error("附件读取失败"));
          reader.readAsDataURL(file);
        });
        const staged = await requirementRepository.stageAttachment({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
        });
        stagedMedia.push({ id: staged.id, name: file.name, type: "file", dataUrl, size: file.size, mimeType: file.type });
      } catch {
        stagedMedia.push({ id: `unstaged-${localId}`, name: file.name, type: "file", dataUrl: URL.createObjectURL(file), size: file.size, mimeType: file.type });
        addToast("warning", "附件暂存失败", `${file.name} 已保留在当前操作中，提交时请确认服务可用`);
      }
    }
    return stagedMedia;
  };
  const onFlowMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const mediaItems = await stageFlowFiles(Array.from(event.target.files || []) as File[]);
    setFlowMedia((items) => [...items, ...mediaItems]);
    event.target.value = "";
  };
  const onTaskMedia = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const mediaItems = await stageFlowFiles(Array.from(event.target.files || []) as File[]);
    setSubTasks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, media: [...item.media, ...mediaItems] } : item));
    event.target.value = "";
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedEmployee = employees.find(
      (item) => item.name === ownerName.trim(),
    ) || (workOrderType === "客户诉求" && specialFields.transferToProduct === "不需要" && ownerName === currentUser.name ? currentUser : undefined);
    const selectedProductLine = availableProductLines.find((item) => item.id === productLineId);
    const descriptionText = description || editor.current?.innerText || "";
    const requiredParameters = workOrderType === "售前支持"
      ? ["opportunityId", "supportType"]
      : workOrderType === "线上问题"
        ? ["projectName"]
        : workOrderType === "其他问题"
          ? ["problemType"]
          : workOrderType === "交付支持"
            ? ["projectName"]
            : workOrderType === "客户诉求"
              ? ["projectName", "requestSource"]
              : [];
    const missingParameter = requiredParameters.some((field) => !String(specialFields[field] ?? "").trim()) || (workOrderType === "售前支持" && !selectedRelatedOpportunity);
    const requiresProduct = workOrderType !== "其他问题";
    if (
      !title.trim() ||
      !selectedEmployee ||
      !dueDate.trim() ||
      (requiresProduct && !selectedProductLine) ||
      !descriptionText.trim() ||
      missingParameter
    ) {
      addToast("warning", missingParameter ? "请完成所有必填业务参数" : `请补充标题、负责人、${requiresProduct ? "所属产品、" : ""}期望完成时间和事项描述`);
      return;
    }
    const customer = customers.find((item) => item.id === customerId)
      || customers.find((item) => item.name.trim().toLocaleLowerCase() === customerQuery.trim().toLocaleLowerCase());
    setIsSubmitting(true);
    try {
      const saved = await addRequirementTask({
        title: title.trim(),
        description: descriptionText,
        descriptionHtml: descriptionHtml || editor.current?.innerHTML || "",
        media,
        productLineId: selectedProductLine?.id,
        productLineName: selectedProductLine?.name || "",
        ownerName: selectedEmployee.name,
        department: selectedEmployee.department,
        customerId: customer?.id || customerId || undefined,
        customerName: customer?.name,
        priority: (requirementPriority || "中") as RequirementTask["priority"],
        workOrderType: workOrderType || "其他问题",
        specialFields: workOrderType === "客户诉求" ? { ...specialFields, transferToProduct: specialFields.transferToProduct || "需要" } : specialFields,
        expectedCompleteDate: dueDate || undefined,
      });
      if (!saved) return;
      setCreating(false);
      setTypeFilter("all");
      setScope("mine_created");
      setPage(1);
    } finally {
      setIsSubmitting(false);
    }
  };
  const openDetail = async (item: RequirementTask) => {
    setSelected({ ...item, media: normalizeMedia(item.media) });
    try {
      const detail = await requirementRepository.detail(item.id);
      setSelected((current) => ({ ...(current || item), ...normalizeRequirementTask(detail), media: normalizeMedia(detail.media ?? current?.media ?? item.media) }));
      let nextEvents = Array.isArray(detail.events) ? detail.events : [];
      let nextWorkItems = Array.isArray(detail.workItems) ? detail.workItems : [];
      setEvents(nextEvents);
      setWorkItems(nextWorkItems);
    } catch {
      setEvents(Array.isArray(item.events) ? item.events : []);
      setWorkItems([]);
    }
  };
  useEffect(() => {
    const detailId = new URLSearchParams(detailSearch).get('detailId') || '';
    if (!detailId) return;
    let active = true;
    requirementRepository.detail(detailId).then((detail) => {
      if (!active) return;
      setSelected(normalizeRequirementTask(detail));
      setEvents(Array.isArray(detail.events) ? detail.events : []);
      setWorkItems(Array.isArray(detail.workItems) ? detail.workItems : []);
    }).catch((error) => { if (active) addToast('error', '事项详情加载失败', error instanceof Error ? error.message : '事项不存在或无权访问'); });
    return () => { active = false; };
  }, [detailSearch]);
  const closeDetail = () => {
    setTaskCreationKind(null);
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('detailId');
    window.history.replaceState(null, '', url);
  };
  const copyDetailLink = async () => {
    if (!selected) return;
    const url = workItemDetailLink(selected.id, 'WORK_ORDER');
    try {
      await copyToClipboard(url);
      addToast('success', '详情链接已复制');
    } catch (error) {
      addToast('error', '复制失败', error instanceof Error ? error.message : '请检查浏览器剪贴板权限');
    }
  };
  const copyDetailId = async () => {
    if (!selected) return;
    try {
      await copyToClipboard(selected.code || selected.id);
      addToast('success', '事项编号已复制');
    } catch (error) {
      addToast('error', '复制失败', error instanceof Error ? error.message : '请检查浏览器剪贴板权限');
    }
  };
  const handleWorkflowSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || workflowSubmitting) return;
    if ((workflowAction === "convert" && !canAddTask) || (workflowAction === "reassign" && !canReceive)) return;
    if (!workflowAction) {
      addToast("warning", "请选择流转的任务类型");
      return;
    }
    const now = new Date().toISOString();

    if (workflowAction === "convert") {
      const invalidTask = subTasks.find((task) => !task.taskType);
      if (invalidTask) {
        addToast("warning", "请选择任务类型");
        return;
      }
      const taskInputs = subTasks.map((task) => ({ task, assignee: employees.find((item) => item.name.trim().toLocaleLowerCase() === task.assignee.trim().toLocaleLowerCase()) }));
      if (taskInputs.some(({ assignee }) => !assignee)) {
        addToast("warning", "请选择任务负责人", "请输入负责人姓名并从下拉列表中选择");
        return;
      }
      if (subTasks.some((task) => task.media.some((item) => item.id.startsWith("unstaged-")))) {
        addToast("warning", "仍有附件上传失败", "请移除上传失败的附件或重新选择后再提交");
        return;
      }
      const singleTask = taskInputs[0];
      let results: Array<{ task: typeof singleTask.task; assignee: NonNullable<typeof singleTask.assignee>; result: Awaited<ReturnType<typeof requirementRepository.createWorkItem>> }>;
      setWorkflowSubmitting(true);
      try {
        const batch = await requirementRepository.createWorkItemsBatch(selected.id, taskInputs.map(({ task, assignee }) => ({ taskType: task.taskType!, assigneeName: assignee!.name, note: task.note, expectedCompleteDate: task.expectedDueDate, attachmentIds: task.media.map((item) => item.id), blocksClosure: true })));
        results = taskInputs.map(({ task, assignee }, index) => ({ task, assignee: assignee!, result: batch.items[index] as Awaited<ReturnType<typeof requirementRepository.createWorkItem>> }));
      } catch {
        addToast("error", "下游任务创建失败", "本次批量操作未保存，请检查后重试");
        return;
      } finally {
        setWorkflowSubmitting(false);
      }
      const localItems: RequirementWorkItem[] = results.map(({ task, assignee, result }) => ({ id: result.id, requirementId: selected.id, taskType: task.taskType!, title: selected.title, assigneeName: assignee.name, note: task.note, status: "待处理", createdAt: now }));
      const primary = results[0];
      const next = {
        ...selected,
        status: "处理中" as RequirementTask["status"],
        taskType: primary.task.taskType,
        assignedOwnerName: primary.assignee.name,
        assignedNote: primary.task.note,
        events: [
          ...(selected.events || []),
          {
            id: `event-${Date.now()}`,
            eventType: "转任务",
            fromStatus: selected.status,
            toStatus: "处理中",
            reason: primary.task.note,
            operatorName: currentUser.name,
            createdAt: now,
          },
        ],
      };
      setRequirementTasks((list) =>
        list.map((item) => (item.id === selected.id ? next : item)),
      );
      setSelected(next);
      setWorkItems((list) => [...localItems, ...list]);
      setEvents((list) => [...list, next.events![next.events!.length - 1]]);
      setWorkOpen(false);
      addToast("success", "已创建下游事项", `已生成 ${localItems.length} 条任务，关联事项已自动建立`);
    } else if (workflowAction === "reassign") {
      if (flowMedia.some((item) => item.id.startsWith("unstaged-"))) {
        addToast("warning", "仍有附件上传失败", "请移除上传失败的附件或重新选择后再提交");
        return;
      }
      const selectedAssignee = employees.find((item) => item.name.trim().toLocaleLowerCase() === reassignAssignee.trim().toLocaleLowerCase());
      if (!selectedAssignee) {
        addToast("warning", "请选择新的转派负责人", "请输入负责人姓名并从下拉列表中选择");
        return;
      }
      if (!reassignReason.trim()) {
        addToast("warning", "请输入转派原因说明");
        return;
      }
      setWorkflowSubmitting(true);
      try {
        const next = await requirementRepository.reassign(selected.id, {
          assigneeId: selectedAssignee.id,
          reason: reassignReason.trim(),
          attachmentIds: flowMedia.map((item) => item.id).filter((id) => !id.startsWith("unstaged-")),
          revision: selected.revision ?? selected.version ?? 0,
        });
        setRequirementTasks((list) => list.map((item) => item.id === selected.id ? { ...item, ...next } : item));
        setSelected((current) => current ? { ...current, ...next } : current);
        setEvents(Array.isArray(next.events) ? next.events : []);
        setWorkOpen(false);
        setFlowMedia([]);
        addToast("success", "已发起转派", `已通知 ${selectedAssignee.name} 接受，接受前当前负责人不变`);
      } catch (error) {
        addToast("error", "事项转派失败", error instanceof Error ? error.message : "服务未确认本次转派，请稍后重试");
      } finally {
        setWorkflowSubmitting(false);
      }
    } else if (workflowAction === "memo") {
      if (!memoContent.trim()) {
        addToast("warning", "请输入个人备忘录内容");
        return;
      }
      if (flowMedia.some((item) => item.id.startsWith("unstaged-"))) {
        addToast("warning", "仍有附件上传失败", "请移除上传失败的附件或重新选择后再提交");
        return;
      }
      setWorkflowSubmitting(true);
      try {
        const next = await requirementRepository.memo(selected.id, { content: memoContent.trim(), attachmentIds: flowMedia.map((item) => item.id).filter((id) => !id.startsWith("unstaged-")), revision: selected.revision ?? selected.version ?? 0 });
        setRequirementTasks((list) => list.map((item) => item.id === selected.id ? next : item));
        setSelected(next);
        setEvents(Array.isArray(next.events) ? next.events : []);
        setWorkOpen(false);
        setFlowMedia([]);
        addToast("success", "个人备忘已保存", "事项状态保持不变，仅本人可见");
      } catch (error) {
        addToast("error", "个人备忘录保存失败", error instanceof Error ? error.message : "服务未确认本次保存，请稍后重试");
      } finally {
        setWorkflowSubmitting(false);
      }
    }
  };
  const transition = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !reasonType) return;
    if (reasonType === "reject" && !rejectCategory) {
      addToast("warning", "请选择驳回原因");
      return;
    }
    const finalReason = reasonType === "reject"
      ? `[${rejectCategory}] ${reason.trim()}`
      : reason.trim();
    if (!finalReason.trim()) return;
    const nextStatus = reasonType === "hold" ? "已搁置" : "已退回";
    try {
      await requirementRepository.transition(
        selected.id,
        reasonType,
        finalReason,
      );
      const detail = await requirementRepository.detail(selected.id);
      if (detail.status !== nextStatus) throw new Error("事项状态未更新，请刷新后重试");
      const next = { ...selected, ...detail };
      setRequirementTasks((list) => list.map((item) => item.id === selected.id ? next : item));
      setSelected(next);
      setEvents(Array.isArray(detail.events) ? detail.events : []);
    } catch {
      addToast("error", "事项操作失败", "服务未确认本次流转，请稍后重试");
      return;
    }
    setReasonType(null);
    setReason("");
    setRejectCategory("");
    addToast(
      "success",
      `事项${nextStatus}`,
      "流转记录已保存",
    );
  };
  const submitComplete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setCompleteSubmitting(true);
    try {
      await requirementRepository.complete(selected.id, { revision: selected.revision ?? selected.version ?? 0, assigneeId: selected.creatorId, assigneeName: selected.creatorName, note: completeNote.trim(), noteHtml: completeNoteHtml, attachmentIds: flowMedia.map((item) => item.id).filter((id) => !id.startsWith("unstaged-")) });
      const detail = await requirementRepository.detail(selected.id);
      const next = { ...selected, ...detail, status: "待验收" as RequirementTask["status"] };
      setSelected(next);
      setEvents(Array.isArray(detail.events) ? detail.events : []);
      setWorkItems(Array.isArray(detail.workItems) ? detail.workItems : []);
      setRequirementTasks((list) => list.map((item) => item.id === next.id ? next : item));
      setCompleteModalOpen(false);
      setCompleteNote("");
      setCompleteNoteHtml("");
      setFlowMedia([]);
      addToast("success", "事项已提交验收", "事项状态已变更为待验收");
    } catch (error) {
      addToast("error", "事项完成失败", error instanceof Error ? error.message : "请刷新后重试");
    } finally { setCompleteSubmitting(false); }
  };
  const submitReopen = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (!reopenAssigneeId || !reopenReason.trim()) { addToast('warning', '请选择处理人并填写重开原因'); return; }
    setReopenSubmitting(true);
    try {
      const result = await requirementRepository.reopen(selected.id, {
        assigneeId: reopenAssigneeId,
        reason: reopenReason.trim(),
        revision: selected.revision ?? selected.version ?? 0,
      });
      if (result.id !== selected.id || !["待处理", "处理中"].includes(result.status)) throw new Error("事项状态未更新，请刷新后重试");
      const detail = result;
      const next = { ...selected, ...detail };
      setSelected(next);
      setRequirementTasks((list) => list.map((item) => (item.id === next.id ? next : item)));
      setEvents(Array.isArray(detail.events) ? detail.events : []);
      setWorkItems(Array.isArray(detail.workItems) ? detail.workItems : []);
      setReopenModalOpen(false);
      setReopenReason("");
      addToast("success", "事项已重新开启", "已提交所选处理人受理");
    } catch (error) {
      addToast("error", "事项重开失败", error instanceof Error ? error.message : "请刷新后重试");
    } finally {
      setReopenSubmitting(false);
    }
  };
  const submitAcceptanceFailed = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !acceptanceReason.trim() || !acceptanceWorkItemId || !acceptanceTaskOwnerId) {
      addToast("warning", "请选择退回任务负责人并填写验收未通过原因");
      return;
    }
    setAcceptanceSubmitting(true);
    try {
      await requirementRepository.acceptanceFailed(selected.id, { reason: acceptanceReason.trim(), workItemId: acceptanceWorkItemId, taskOwnerId: acceptanceTaskOwnerId, revision: selected.revision ?? selected.version ?? 0, attachmentIds: flowMedia.map((item) => item.id).filter((id) => !id.startsWith("unstaged-")) });
      const detail = await requirementRepository.detail(selected.id);
      const next = { ...selected, ...detail, status: "处理中" as RequirementTask["status"] };
      setSelected(next);
      setEvents(Array.isArray(detail.events) ? detail.events : []);
      setWorkItems(Array.isArray(detail.workItems) ? detail.workItems : []);
      setRequirementTasks((list) => list.map((item) => item.id === next.id ? next : item));
      setAcceptanceModalOpen(false);
      setAcceptanceReason("");
      setAcceptanceWorkItemId("");
      setAcceptanceTaskOwnerId("");
      setFlowMedia([]);
      addToast("success", "已退回任务负责人", "事项状态已变更为处理中，请负责人重新处理");
    } catch (error) {
      addToast("error", "验收操作失败", error instanceof Error ? error.message : "请刷新后重试");
    } finally {
      setAcceptanceSubmitting(false);
    }
  };
  const submitComment = async (content: string, requestId: string) => {
    if (!selected) throw new Error("请先打开事项详情");
    try {
      const detail = await requirementRepository.addComment(selected.id, { content, requestId, revision: selected.revision ?? selected.version ?? 0 });
      if (commentMatterId.current === detail.id) {
        setSelected(detail);
        setEvents(Array.isArray(detail.events) ? detail.events : []);
      }
      setRequirementTasks((items) => items.map((item) => item.id === detail.id ? { ...item, ...detail } : item));
      addToast("success", "评论已发表", "已加入事项讨论及全历程");
    } catch (error) {
      addToast("error", "评论发表失败", error instanceof Error ? error.message : "请稍后重试");
      throw error;
    }
  };
  const passAcceptance = async () => {
    if (!selected || acceptanceSubmitting || !acceptanceRating) return;
    setAcceptanceSubmitting(true);
    try {
      await requirementRepository.acceptancePassed(selected.id, { revision: selected.revision ?? selected.version ?? 0, rating: acceptanceRating, comment: acceptanceComment.trim() });
      const detail = await requirementRepository.detail(selected.id);
      if (detail.status !== "已完成") throw new Error("事项尚未完成，请刷新后核实验收结果");
      const next = { ...selected, ...detail };
      setSelected(next); setEvents(Array.isArray(detail.events) ? detail.events : []); setWorkItems(Array.isArray(detail.workItems) ? detail.workItems : []);
      setRequirementTasks((list) => list.map((item) => item.id === next.id ? next : item));
      setRatingModalOpen(false);
      addToast("success", "验收通过", "评价已保存，事项已完成");
    } catch (error) { addToast("error", "验收操作失败", error instanceof Error ? error.message : "请刷新后重试"); }
    finally { setAcceptanceSubmitting(false); }
  };
  const filtered = useMemo(
    () =>
      listItems.filter((item) => {
        const q = query.toLowerCase();
        return (
          isWorkOrderInScope(item, scope, currentUser, organizationEmployees, transferredIds) &&
          (scope !== 'all' || !departmentFilter || ownerDepartment(item, organizationEmployees) === departmentFilter) &&
          (!q ||
            [
              item.title,
              item.description,
              item.ownerName,
              item.productLineName,
              workOrderProjectName(item),
            ].some((value) => value?.toLowerCase().includes(q))) &&
          (product === "all" || item.productLineName === product) &&
          (priority === "all" || item.priority === priority) &&
          (status === "all" || item.status === status) &&
          (typeFilter === "all" || (item.workOrderType || "其他问题") === typeFilter)
        );
      }),
    [
      listItems,
      query,
      product,
      priority,
      status,
      scope,
      typeFilter,
      currentUser, organizationEmployees, transferredIds, departmentFilter,
    ],
  );
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [query, product, priority, status, scope, typeFilter, pageSize, departmentFilter]);
  const pendingCount = requirementTasks.filter(
    (item) => item.status === "待处理",
  ).length;
  const processingCount = requirementTasks.filter(
    (item) => item.status === "处理中",
  ).length;
  const handledCount = requirementTasks.filter((item) =>
    ["已完成", "已搁置"].includes(item.status),
  ).length;
  const rejectedCount = requirementTasks.filter(
    (item) => item.status === "已退回",
  ).length;
  const scopeCounts = Object.fromEntries(REQUIREMENT_SCOPES.map(([value]) => [value, listItems.filter((item) => isWorkOrderInScope(item, value, currentUser, organizationEmployees, transferredIds)).length]));
  const isToday = (value?: string) =>
    Boolean(
      value && new Date(value).toDateString() === new Date().toDateString(),
    );
  const todayPending = requirementTasks.filter(
    (item) => isToday(item.createdAt) && item.status === "待处理",
  ).length;
  const todayProcessing = requirementTasks.filter(
    (item) => isToday(item.createdAt) && item.status === "处理中",
  ).length;
  const todayHandled = requirementTasks.filter(
    (item) =>
      isToday(item.createdAt) && ["已完成", "已搁置"].includes(item.status),
  ).length;
  const todayRejected = requirementTasks.filter(
    (item) => isToday(item.createdAt) && item.status === "已退回",
  ).length;
  const ownsSelected = Boolean(selected && (selected.assigneeId && currentUser.id
    ? selected.assigneeId === currentUser.id : samePerson(selected.ownerName, currentUser.name)));
  const canReceive = ownsSelected && selected?.status === "待处理";
  const canAddTask = ownsSelected && selected?.status === "处理中";
  const openTaskCreation = (taskType: string) => {
    if (!selected || !canAddTask || receiving) return;
    setTaskCreationKind(({ "产品需求": "requirement", "设计任务": "design", "缺陷管理": "bug", "售前任务": "presales", "交付任务": "delivery" } as const)[taskType as "产品需求" | "设计任务" | "缺陷管理" | "售前任务" | "交付任务"] || null);
  };
  const taskCreationMenu = {
    items: ["产品", "设计", "缺陷", "售前", "交付"].map((label) => ({ key: label, label })),
    onClick: ({ key }: { key: string }) => openTaskCreation(({ 产品: "产品需求", 设计: "设计任务", 缺陷: "缺陷管理", 售前: "售前任务", 交付: "交付任务" } as Record<string, string>)[key]),
  };
  const openWorkflow = (action: "convert" | "reassign") => {
    if ((action === "convert" && !canAddTask) || (action === "reassign" && !canReceive)) return;
    setWorkflowAction(action);
    setSubTasks([{ taskType: "", assignee: "", expectedDueDate: selected?.expectedCompleteDate || "", note: "", media: [] }]);
    setReassignAssignee(""); setReassignReason(""); setFlowMedia([]);
    setWorkOpen(true);
  };
  const receiveMatter = async () => {
    if (!selected || !canReceive || receiveInFlight.current) return;
    receiveInFlight.current = true;
    setReceiving(true);
    try {
      const next = await requirementRepository.receive(selected.id);
      setSelected((current) => current?.id === selected.id ? { ...current, ...next } : current);
      setRequirementTasks((list) => list.map((item) => item.id === selected.id ? { ...item, ...next } : item));
      setEvents(Array.isArray(next.events) ? next.events : []);
      addToast("success", "事项已接收");
    } catch (error) {
      addToast("error", "事项接收失败", error instanceof Error ? error.message : "请刷新后重试");
    } finally {
      receiveInFlight.current = false;
      setReceiving(false);
    }
  };
  const detailSpecial = selected?.specialFields && typeof selected.specialFields === "object" ? selected.specialFields : {};
  const detailFields: Array<[string, unknown]> = selected ? [
    ...(selected.workOrderType === "其他问题" ? [["协助类型", detailSpecial.problemType], ["负责人", selected.ownerName]] as Array<[string, unknown]> : []),
    [selected.workOrderType === "售前支持" ? "所属商机" : "所属项目",
      selected.workOrderType === "售前支持" ? detailSpecial.opportunityName : detailSpecial.projectName || selected.projectName],
    ["所属产品", selected.productLineName],
    ...(selected.workOrderType !== "其他问题" ? [["负责人", selected.ownerName]] as Array<[string, unknown]> : []),
    ...(selected.workOrderType === "客户诉求" ? [["是否转产品", detailSpecial.transferToProduct || "需要"]] as Array<[string, unknown]> : []),
    ["优先级", selected.priority], ["期望完成时间", selected.expectedCompleteDate || selected.dueDate],
    ...(selected.workOrderType === "客户诉求" ? [["诉求来源", detailSpecial.requestSource]] as Array<[string, unknown]> : []),
    ...(selected.workOrderType === "线上问题" ? [["严重程度", detailSpecial.severity], ["发生频率", detailSpecial.frequency]] as Array<[string, unknown]> : []),
    ...(selected.workOrderType === "售前支持" ? [["支持类型", detailSpecial.supportType]] as Array<[string, unknown]> : []),
    ...(selected.workOrderType === "其他问题" ? [["问题来源", detailSpecial.problemSource]] as Array<[string, unknown]> : []),
  ] : [];
  const selectedMedia = normalizeMedia(selected?.media);
  const cardSubText = (count: number) => `今日新增 +${count}`;
  const fieldClass =
    "mt-1 w-full h-10 px-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";
  const filterClass = "min-w-[130px] shrink-0";
  const creationOwnerField = <EmployeeSearchSelect label="负责人 *" value={ownerName} employees={employees} placeholder="请选择负责人" onChange={(value) => { ownerManuallyChanged.current = true; setOwnerName(value); }} />;
  const fields = <div className="work-order-form grid grid-cols-1 gap-4">
    <WorkOrderInput label="事项标题 *" value={title} onChange={setTitle} placeholder="请输入事项标题，简明描述问题或诉求" />
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {workOrderType === "其他问题" && <WorkOrderSelect label="协助类型 *" value={specialFields.problemType || ""} options={["方向研讨", "费用缴纳", "开票/邮寄", "资料获取", "物料支持", "意见反馈", "其他"]} placeholder="请选择协助类型" onChange={(value) => setSpecialFields((current) => ({ ...current, problemType: value }))} />}
      {workOrderType === "其他问题" && creationOwnerField}
      {(workOrderType === "客户诉求" || workOrderType === "线上问题" || workOrderType === "交付支持" || workOrderType === "其他问题") && <SearchSelect label={`所属项目${workOrderType === "其他问题" ? "" : " *"}`} value={specialFields.projectName || ""} options={biddings.filter((item) => item.result === "中标" || item.status === "中标").map((item) => item.projectName || item.name || "")} placeholder="输入项目名称搜索并选择" onChange={(value) => { setSpecialFields((current) => ({ ...current, projectName: value })); changeCreationProduct(""); }} />}
      {workOrderType === "售前支持" && <label className="work-order-field text-xs text-[var(--text-muted)]">
        所属商机 *
        <Select aria-label="所属商机 *" allowClear showSearch optionFilterProp="label" className="w-full" placeholder="输入商机名称" value={specialFields.opportunityId || undefined} options={opportunities.map((item) => ({ label: item.name, value: item.id }))} onChange={(id) => { const opportunity = opportunities.find((item) => item.id === id); setSpecialFields((current) => ({ ...current, opportunityName: opportunity?.name || "", opportunityId: opportunity?.id || "", relatedType: opportunity ? "opportunity" : "" })); changeCreationProduct(""); }} />
      </label>}
      <WorkOrderSelect label={`所属产品${workOrderType === "其他问题" ? "" : " *"}`} value={creationProduct?.name || ""} options={availableProductLines.map((item) => item.name)} disabled={!hasProductSource || availableProductLines.length === 0} placeholder={!hasProductSource ? workOrderType === "售前支持" ? "请先选择所属商机" : "请先选择所属项目" : availableProductLines.length ? "请选择所属产品" : "所选项目或关联对象暂无产品"} onChange={(value) => changeCreationProduct(availableProductLines.find((item) => item.name === value)?.id || "")} />
      {workOrderType !== "其他问题" && creationOwnerField}
      <WorkOrderSelect label="优先级" value={requirementPriority} options={["紧急", "高", "中", "低"]} placeholder="请选择优先级" onChange={(value) => setRequirementPriority(value as RequirementTask["priority"])} />
      <DateField label="期望完成时间 *" value={dueDate} onChange={setDueDate} />
      {workOrderType === "客户诉求" && <WorkOrderInput label="诉求来源 *" value={specialFields.requestSource || ""} placeholder="请输入诉求来源" onChange={(value) => setSpecialFields((current) => ({ ...current, requestSource: value }))} />}
      {workOrderType === "客户诉求" && <WorkOrderSelect label="是否转产品" value={specialFields.transferToProduct || "需要"} options={["需要", "不需要"]} onChange={(value) => { ownerManuallyChanged.current = false; setSpecialFields((current) => ({ ...current, transferToProduct: value })); setOwnerName(value === "不需要" ? currentUser.name : employees.find((employee) => primaryOwnerId ? employee.id === primaryOwnerId : Boolean(primaryOwnerName) && employee.name === primaryOwnerName)?.name || ""); }} />}
      {workOrderType === "线上问题" && <>
        <WorkOrderSelect label="严重程度" value={specialFields.severity || ""} options={Object.keys(severityPriorities)} placeholder="请选择严重程度（选填）" onChange={(value) => { const priority = severityPriorities[value]; setSpecialFields((current) => ({ ...current, severity: value, ...(priority ? { priority } : {}) })); if (priority) setRequirementPriority(priority); }} />
        <WorkOrderSelect label="发生频率" value={specialFields.frequency || ""} options={["必现（100%）", "高频发生", "偶现（特点条件）", "环境相关偶发"]} placeholder="请选择发生频率" onChange={(value) => setSpecialFields((current) => ({ ...current, frequency: value }))} />
      </>}
      {workOrderType === "售前支持" && <WorkOrderSelect label="支持类型 *" value={specialFields.supportType || ""} options={["建设方案", "现场踏勘", "方案汇报", "报价支持", "技术表", "投标答疑", "产品需求", "招投标标书协同"]} placeholder="请选择支持类型" onChange={(value) => setSpecialFields((current) => ({ ...current, supportType: value }))} />}
      {workOrderType === "其他问题" && <WorkOrderInput label="问题来源" value={specialFields.problemSource || ""} placeholder="请输入问题来源" onChange={(value) => setSpecialFields((current) => ({ ...current, problemSource: value }))} />}
    </div>
    <div>
      <span className="text-xs text-[var(--text-muted)]">{workOrderType === "客户诉求" ? "客户原始诉求 *" : "事项描述 *"}</span>
      <RichTextEditor size="work-order" editor={editor} onInput={(text, html) => { setDescription(text); setDescriptionHtml(html); }} />
    </div>
    {workOrderType === "客户诉求" && specialFields.transferToProduct !== "不需要" && <div>
      <span className="text-xs text-[var(--text-muted)]">产品需求描述</span>
      <RichTextEditor size="work-order" editor={productDescriptionEditor} value={specialFields.productDescription || ""} htmlValue={specialFields.productDescriptionHtml || ""} onInput={(text, html) => setSpecialFields((current) => ({ ...current, productDescription: text, productDescriptionHtml: html }))} />
    </div>}
      <div className="mt-2 flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-body)]">
          <Paperclip className="h-4 w-4" />
          添加文档附件（支持 TXT/DOC/EXCEL/PDF 文档）
          <input type="file" accept=".txt,.doc,.docx,.xls,.xlsx,.pdf" multiple className="sr-only" onChange={onMedia} />
        </label>
        {media.length > 0 && <div className="flex flex-wrap gap-2">{media.map((item) => <span key={item.id} className="inline-flex items-center gap-1 rounded border border-[var(--border-main)] px-2 py-1 text-xs text-[var(--text-body)]">{item.name}<button type="button" title="移除附件" aria-label="移除附件" onClick={() => setMedia((items) => items.filter((mediaItem) => mediaItem.id !== item.id))}><X className="h-3 w-3" /></button></span>)}</div>}
      </div>
  </div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {creating && (
        <section className="dark-panel max-h-[calc(100dvh-190px)] overflow-y-auto overscroll-contain rounded-xl p-6">
            <form onSubmit={save} className="space-y-5">
              <div className="sticky -top-6 z-10 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-[var(--border-main)] bg-[var(--bg-surface)] px-6 py-4 lg:-top-6">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    {workOrderDisplayName(workOrderType) || "发起协同"}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    提交后将会自动通知到负责人
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setCreating(false)}
                    className="h-10 rounded-lg border border-[var(--border-main)] px-4 text-sm text-[var(--text-body)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (productLines.length === 0 && workOrderType !== "其他问题")}
                    className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting && <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                    {isSubmitting ? "提交中…" : productLines.length === 0 && workOrderType !== "其他问题" ? "暂无可用产品" : "发起协同"}
                  </button>
                </div>
              </div>
              {fields}
            </form>
        </section>
      )}
      {!creating && (
        <>
          <div className="dark-panel rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 pb-1">
              <div className="inline-flex max-w-full flex-wrap items-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-1">
                {REQUIREMENT_SCOPES.map(([value, label]) => <button key={value} type="button" aria-pressed={scope === value} onClick={() => { setScope(value); setDepartmentFilter(''); }} className={`h-8 rounded-md px-4 text-xs font-semibold whitespace-nowrap transition focus-visible:outline focus-visible:outline-[var(--primary)] ${scope === value ? "bg-[var(--bg-surface-soft)] text-[var(--active-text)] shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"}`}>{label} ({scopeLoading ? '…' : scopeCounts[value]})</button>)}
              </div>
            </div>
            <div className="work-order-list-filters flex flex-wrap items-center gap-3">
            <div className="relative shrink-0">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索标题/项目/产品/负责人"
                prefix={<Search className="h-4 w-4 text-[var(--text-muted)]" />}
                className="w-64"
              />
            </div>
            <Select allowClear aria-label="事项类型" className={filterClass} placeholder="类型" value={typeFilter === "all" ? undefined : typeFilter} onChange={(value) => setTypeFilter(value ?? "all")} options={workOrderTypes.map((type) => ({ label: workOrderDisplayName(type), value: type }))} />
            <Select allowClear aria-label="状态" className={filterClass} placeholder="状态" value={status === "all" ? undefined : status} onChange={(value) => setStatus(value ?? "all")} options={statuses.map((item) => ({label:item,value:item}))} />
            <Select allowClear aria-label="优先级" className={filterClass} placeholder="优先级" value={priority === "all" ? undefined : priority} onChange={(value) => setPriority(value ?? "all")} options={[{label:"紧急",value:"紧急"},{label:"高",value:"高"},{label:"中",value:"中"},{label:"低",value:"低"}]} />
            {scope === 'all' && <Select allowClear showSearch optionFilterProp="label" aria-label="所属部门" className={filterClass} placeholder="所属部门" disabled={scopeLoading || Boolean(scopeError)} value={departmentFilter || undefined} onChange={(value) => setDepartmentFilter(value || '')} options={toSelectOptions(organizationEmployees.map((person) => person.department || ''))} />}
            <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: workOrderTypes.map((type) => ({ key: type, label: workOrderDisplayName(type) })), onClick: ({ key }) => openCreate(key as WorkOrderType) }}>
              <Button type="primary" className="ml-auto" icon={<Plus size={16} />}>
                发起协同 <ChevronDown size={16} />
              </Button>
            </Dropdown>
            </div>
          </div>
          {scopeLoading && <p role="status" className="text-xs text-[var(--text-muted)]">正在加载事项范围…</p>}
          {scopeError && <div role="alert" className="text-xs text-[var(--danger)]">事项范围加载失败：{scopeError} <Button size="small" onClick={() => setScopeReload((value) => value + 1)}>重试</Button></div>}
          <div className="dark-panel rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-main)] text-[var(--text-muted)]">
                    <th className="px-4 py-3">标题</th>
                    <th className="px-4 py-3">事项类型</th>
                    <th className="px-4 py-3">优先级</th>
                    <th className="px-4 py-3">关联项目</th>
                    <th className="px-4 py-3">关联产品</th>
                    <th className="px-4 py-3">负责人</th>
                    <th className="px-4 py-3">创建人</th>
                    <th className="px-4 py-3">创建时间</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--border-main)]"
                    >
                      <td className="px-4 py-3 font-semibold">
                        <div className="flex items-start gap-2">
                          <Inbox className="mt-0.5 w-4 h-4 text-[var(--active-text)] shrink-0" />
                          <button type="button" onClick={() => openDetail(item)} className="max-w-[260px] line-clamp-2 text-left text-[var(--active-text)] hover:text-[var(--primary-hover)] hover:underline">
                            {item.title}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-body)]">
                        <span>{workOrderDisplayName(item.workOrderType) || "历史事项"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag status={item.priority} />
                      </td>
                      <td className="px-4 py-3 text-[var(--text-body)]">
                        {workOrderProjectName(item) || "未关联"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-body)]">
                        {item.productLineName || "未关联"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-body)]">
                        {item.ownerName || "未分配"}
                      </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {item.creatorName || item.ownerName}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{item.createdAt || "-"}</td>
                      <td className="px-4 py-3">
                        <StatusTag status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                        >
                          详情
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center text-sm text-[var(--text-muted)]">
                  暂无符合条件的需求
                </div>
              )}
            </div>
            <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        </>
      )}
      {selected && (
        <Drawer
          isOpen={!!selected}
          width="max-w-6xl"
          contentClassName="overflow-hidden"
          onClose={closeDetail}
          hideSubtitle
          title={<span className="flex min-w-0 items-center gap-2"><span className="shrink-0">事项编号</span><span className="truncate font-mono">{selected.code || selected.id}</span><DetailCopyButton label="复制事项编号" onCopy={copyDetailId} /></span>}
          headerActions={<DetailCopyButton label="复制详情链接" link onCopy={copyDetailLink} />}
          subtitle={`${selected.productLineName} · 负责人：${selected.ownerName || "未分配"}`}
          footer={
            <div className="flex w-full justify-between">
              <div className="flex items-center gap-2">
                {canReceive && <><Button aria-label="事项接收" type="primary" loading={receiving} disabled={receiving} onClick={() => void receiveMatter()}>事项接收</Button><Button disabled={receiving} onClick={() => openWorkflow("reassign")}>事项转交</Button><Button danger disabled={receiving} onClick={() => setReasonType("reject")}>事项退回</Button></>}
                {(selected.status === "处理中" || (selected.status === "已退回" && isInitiator(selected, currentUser))) && ownsSelected && <Button type="primary" disabled={completeSubmitting || workItems.some((item) => !(item.status === "已完成" || item.assistanceTaskStatus === "COMPLETED"))} onClick={() => setCompleteModalOpen(true)}>事项完成</Button>}
                {selected.status === "待验收" && isInitiator(selected, currentUser) && <><Button type="primary" loading={acceptanceSubmitting} disabled={acceptanceSubmitting} onClick={() => { setAcceptanceRating(0); setAcceptanceComment(""); setRatingModalOpen(true); }}>验收通过</Button><button type="button" onClick={() => { const first = workItems.find((item) => item.status === "已完成" || item.assistanceTaskStatus === "COMPLETED"); const owner = first ? employees.find((person) => person.name === first.assigneeName) : undefined; setAcceptanceWorkItemId(first?.id || ""); setAcceptanceTaskOwnerId(owner?.id || ""); setAcceptanceModalOpen(true); }} className="h-9 px-3 rounded-lg border border-[var(--danger)] text-xs font-semibold text-[var(--danger)] hover:bg-[var(--bg-hover)]">验收未通过</button></>}
                {selected.status === "已完成" && isInitiator(selected, currentUser) && <button type="button" onClick={() => { setReopenAssigneeId(""); setReopenReason(""); setReopenModalOpen(true); }} className="h-9 px-3 rounded-lg border border-[var(--primary)] text-xs font-semibold text-[var(--active-text)] hover:bg-[var(--bg-hover)]">重新开启</button>}
              </div>
              <button type="button" onClick={closeDetail} className="h-9 px-4 rounded-lg border border-[var(--border-main)] text-xs text-[var(--text-body)]">关闭</button>
            </div>
          }
        >
          <div className="grid h-full min-h-0 grid-cols-1 gap-6 overflow-y-auto lg:grid-cols-3 lg:overflow-hidden">
            <div aria-label="事项内容" className="min-h-0 min-w-0 space-y-5 text-sm lg:col-span-2 lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
              <section aria-label="基础字段" className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
                <div className="flex items-start justify-between gap-4"><h2 className="break-words text-lg font-semibold text-[var(--text-primary)]">{selected.title}</h2><StatusTag status={selected.status} /></div>
                <h3 className="my-4 text-sm font-semibold text-[var(--text-primary)]">基础字段</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {detailFields.map(([label, value]) => <div key={label}><span className="text-xs text-[var(--text-muted)]">{label}</span><p className="mt-1 break-words text-[var(--text-primary)]">{String(value || "未设置")}</p></div>)}
                  <div><span className="text-xs text-[var(--text-muted)]">创建人</span><p className="mt-1 text-[var(--text-primary)]">{selected.creatorName || "未记录"}</p></div>
                </div>
                {Object.entries(detailSpecial).some(([key, value]) => value && ["progressStage", "other", "deliveryType", "expectedResult", "leadName", "biddingName"].includes(key)) && <details className="mt-4 border-t border-[var(--border-main)] pt-3"><summary className="cursor-pointer text-xs text-[var(--text-muted)]">历史字段（仅查看）</summary><div className="mt-3 grid grid-cols-2 gap-3">{Object.entries(detailSpecial).filter(([key, value]) => value && ["progressStage", "other", "deliveryType", "expectedResult", "leadName", "biddingName"].includes(key)).map(([key, value]) => <div key={key}><span className="text-xs text-[var(--text-muted)]">{({ progressStage: "项目阶段", other: "项目类型", deliveryType: "交付类型", expectedResult: "期望结果", leadName: "所属线索", biddingName: "所属投标" } as Record<string, string>)[key]}</span><p className="mt-1 break-words">{String(value)}</p></div>)}</div></details>}
              </section>
              <section aria-label={selected.workOrderType === "客户诉求" ? "客户原始诉求" : "事项描述"}><h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">{selected.workOrderType === "客户诉求" ? "客户原始诉求" : "事项描述"}</h3><div className="break-words rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-3 text-sm text-[var(--text-body)]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.descriptionHtml || selected.description || "暂无描述") }} /></section>
              {selected.workOrderType === "客户诉求" && detailSpecial.transferToProduct !== "不需要" && <section aria-label="产品需求描述"><h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">产品需求描述</h3><div className="break-words rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(detailSpecial.productDescriptionHtml || detailSpecial.productDescription || "暂无描述")) }} /></section>}
              <section aria-label="附件"><h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">附件</h3>
                {!selectedMedia.length && !selected.attachments?.length && <p className="text-xs text-[var(--text-muted)]">暂无附件</p>}
              {selectedMedia.length ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {selectedMedia.map((item) =>
                    item.type === "image" ? (
                      <img
                        key={item.id}
                        src={item.dataUrl}
                        alt={item.name}
                        className="max-h-36 rounded border border-[var(--border-main)]"
                      />
                    ) : item.type === "video" ? (
                      <video
                        key={item.id}
                        src={item.dataUrl}
                        controls
                        className="max-h-36 rounded border border-[var(--border-main)]"
                      />
                    ) : (
                      <a key={item.id} href={item.dataUrl} download={item.name} className="inline-flex items-center gap-2 rounded border border-[var(--border-main)] px-3 py-2 text-xs text-[var(--active-text)] hover:bg-[var(--bg-surface-soft)]"><Paperclip className="h-3.5 w-3.5" />{item.name}</a>
                    ),
                  )}
                </div>
              ) : null}
              {selected.attachments?.length ? (
                <div className="mt-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3">
                  <div className="mb-2 text-xs font-medium text-[var(--text-body)]">流转附件</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.attachments.map((item: AttachmentMetadata) => (
                      <a key={item.id} href={item.dataUrl} download={item.name} className="inline-flex items-center gap-1 rounded border border-[var(--border-main)] px-2 py-1 text-xs text-[var(--active-text)] hover:bg-[var(--bg-hover)]">
                        <Paperclip className="h-3.5 w-3.5" />{item.name}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
              </section>
              <WorkOrderDiscussion key={selected.id} events={events} formatTime={formatDateTime} open={commentsModalOpen} targetId={commentTargetId} onOpen={() => { setCommentTargetId(""); setCommentsModalOpen(true); }} onClose={() => { setCommentsModalOpen(false); setCommentTargetId(""); }} onSubmit={submitComment} />
            </div>
            <div aria-label="事项任务与历程" className="min-h-0 min-w-0 space-y-5 text-sm lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
            <section>
              <div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[var(--text-primary)]">关联任务（{displayedWorkItems.length}）</h3><Dropdown key={canAddTask && !receiving ? 'enabled' : 'disabled'} trigger={["click"]} disabled={!canAddTask || receiving} menu={taskCreationMenu}><Button type="primary" disabled={!canAddTask || receiving}>新增任务 <ChevronDown className="ml-1 inline h-3.5 w-3.5" /></Button></Dropdown></div>
              {displayedWorkItems.length ? <div ref={taskListRef} aria-label="关联任务列表" className="space-y-2 overflow-y-auto overscroll-contain" style={{ maxHeight: taskListHeight ? `min(${taskListHeight}px, 40vh)` : "40vh" }}>{displayedWorkItems.map((item) => {
                const done = item.status === "已完成" || item.assistanceTaskStatus === "COMPLETED";
                const accepted = item.assistanceTaskStatus === "ACCEPTED";
                const taskTargetPage = TASK_PAGE_BY_TYPE[item.taskType] || "prod_req_tasks";
                const taskEvents = Array.isArray(item.events) ? [...item.events].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))) : [];
                return <div key={item.id} className="space-y-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-3 text-xs">
                  <div className="space-y-2">
                    <div className="flex min-w-0 items-center gap-2"><WorkItemCategoryIcon category={taskIconCategory(item.taskType)} className="h-4 w-4 shrink-0 text-[var(--primary)]" /><button type="button" className="min-w-0 flex-1 truncate text-left font-semibold text-[var(--active-text)] hover:text-[var(--primary-hover)]" onClick={() => { openWorkItemDetailLink(item.id, item.category || taskTargetPage, item.productLineId || selected.productLineId); }}><span className="sr-only">{item.taskType} · {item.title}</span><span aria-hidden="true">{item.title}</span></button></div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--text-muted)]"><span>{item.assigneeName || '未分配'}</span><StatusTag status={relatedTasks?.indirectIds.has(item.id) ? item.status : accepted ? "已验收" : done ? "待发起人验收" : item.status} />{item.overdueRisk && <span className="text-[var(--danger)]">已逾期</span>}{done && !accepted && !relatedTasks?.indirectIds.has(item.id) && isInitiator(selected, currentUser) && <button type="button" onClick={async () => { try { await requirementRepository.acceptWorkItem(selected.id, item.id); const detail = await requirementRepository.detail(selected.id); setSelected(detail); setEvents(Array.isArray(detail.events) ? detail.events : []); setWorkItems(Array.isArray(detail.workItems) ? detail.workItems : []); addToast("success", "任务验收通过", "该任务已计入事项验收进度"); } catch (error) { addToast("error", "任务验收失败", error instanceof Error ? error.message : "请刷新后重试"); } }} className="text-[var(--active-text)] hover:text-[var(--primary-hover)]">验收通过</button>}</div>
                  </div>
                  <div className="border-t border-[var(--border-main)]" />
                  {taskEvents.length > 0 && <div className="space-y-2"><div className="text-[11px] font-semibold text-[var(--text-muted)]">任务变化历程</div>{taskEvents.map((taskEvent) => <div key={taskEvent.id} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-2"><div className="flex justify-between gap-2"><b className="text-[var(--active-text)]">{taskEvent.eventType}</b><span className="text-[11px] text-[var(--text-muted)]">{formatDateTime(taskEvent.createdAt)}</span></div><div className="mt-1 text-[11px] text-[var(--text-muted)]">操作人：{taskEvent.operatorName || "未知"}{taskEvent.fromStatus || taskEvent.toStatus ? ` · ${taskEvent.fromStatus || "—"} → ${taskEvent.toStatus || "—"}` : ""}</div>{taskEvent.reason && <p className="mt-1 text-xs text-[var(--text-body)]">{taskEvent.reason}</p>}</div>)}</div>}
                </div>;
              })}</div> : <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-center"><p className="text-sm text-[var(--text-muted)]">暂无关联任务</p><Dropdown trigger={["click"]} disabled={!canAddTask || receiving} menu={taskCreationMenu}><Button className="mt-3" disabled={!canAddTask || receiving}>新增第一个任务</Button></Dropdown></div>}
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">事项全历程</h3>
              {events.length ? <div aria-label="事项全历程列表" className="max-h-80 space-y-3 overflow-y-auto overscroll-contain">{[...events].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).map((item) => {
                const meta = eventMetadata(item.metadata);
                const targetPage = typeof meta.targetPage === "string" ? meta.targetPage : "";
                const progressValue = meta.toProgress ?? meta.progress;
                const progress = typeof progressValue === "number" || typeof progressValue === "string" ? Number(progressValue) : null;
                const taskTitle = String(meta.taskTitle || "").trim();
                const noteHtml = typeof meta.noteHtml === "string" ? meta.noteHtml : typeof meta.contentHtml === "string" ? meta.contentHtml : "";
                const attachments = eventAttachments(meta);
                return <div key={item.id} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-3">
                  <div className="flex justify-between gap-2"><b className="text-[var(--active-text)]">{item.eventType}{meta.isDemo === true && <span className="ml-2 rounded bg-[var(--bg-surface-soft)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">示例历程</span>}</b><span className="text-[11px] text-[var(--text-muted)]">{formatDateTime(item.createdAt)}</span></div>
                  <div className="mt-1 text-[11px] text-[var(--text-muted)]">{eventOperatorLabel(item, meta)}</div>
                  {typeof meta.rating === "number" && <div className="mt-2 flex items-center gap-2"><Rate disabled value={meta.rating} count={5} /><span className="text-xs">{meta.rating} 星</span></div>}
                  {item.eventType === "发表评论" && typeof meta.commentContent === "string" ? <Button type="link" className="mt-2" onClick={() => { setCommentTargetId(item.id); setCommentsModalOpen(true); }}>查看评论</Button> : noteHtml ? <div className="mt-2 break-words text-xs" dangerouslySetInnerHTML={{ __html: sanitizeHtml(noteHtml) }} /> : item.reason && <p className="mt-2 whitespace-pre-wrap break-words text-xs">{item.reason}</p>}
                  {attachments.length > 0 && <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--border-main)] pt-3">{attachments.map((attachment) => attachment.type === "image" && attachment.dataUrl ? <a key={attachment.id} href={attachment.dataUrl} target="_blank" rel="noreferrer" title={attachment.name}><img src={attachment.dataUrl} alt={attachment.name} className="h-16 w-16 rounded border border-[var(--border-main)] object-cover" /></a> : <a key={attachment.id} href={attachment.dataUrl || "#"} download={attachment.name} target={attachment.dataUrl ? "_blank" : undefined} rel={attachment.dataUrl ? "noreferrer" : undefined} className="max-w-48 truncate rounded border border-[var(--border-main)] px-2 py-1 text-[11px] text-[var(--active-text)] hover:bg-[var(--bg-hover)]">{attachment.name}</a>)}</div>}
                  {progress !== null && <div className="mt-2 text-xs text-[var(--text-muted)]">任务进度：{Math.max(0, Math.min(100, progress))}%{meta.overdueRisk === true && <span className="ml-2 text-[var(--danger)]">已逾期</span>}</div>}
                  {meta.taskType && <><div className="my-3 border-t border-[var(--border-main)]" /><button type="button" className="text-left text-xs text-[var(--active-text)] hover:text-[var(--primary-hover)]" onClick={() => {
                    if (!targetPage) return;
                    sessionStorage.setItem('shichuang.task.search', JSON.stringify({ targetPage, title: taskTitle }));
                    openPageTab(targetPage as Parameters<typeof openPageTab>[0]);
                  }}>{String(meta.taskType)} · {taskTitle || "关联任务"} <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></>}
                </div>;
              })}</div> : <p className="text-xs text-[var(--text-muted)]">暂无事项流转记录</p>}
            </section>
            </div>
          </div>
        </Drawer>
      )}
      {taskCreationKind && selected && <RequirementTasksView
        key={taskCreationKind}
        taskKind={taskCreationKind}
        itemLabel={{ requirement: "产品任务", design: "设计任务", bug: "缺陷", presales: "售前任务", delivery: "交付任务" }[taskCreationKind]}
        creationContext={{
          productLineId: selected.productLineId || productLines.find((line) => line.name === selected.productLineName)?.id || '',
          sourceWorkOrder: selected,
          onClose: () => setTaskCreationKind(null),
          onCreated: () => { void requirementRepository.detail(selected.id).then((detail) => {
            setSelected(detail); setEvents(Array.isArray(detail.events) ? detail.events : []); setWorkItems(Array.isArray(detail.workItems) ? detail.workItems : []);
            setRequirementTasks((items) => items.map((item) => item.id === detail.id ? { ...item, ...detail } : item));
          }).catch((error) => addToast("error", "事项详情刷新失败", error instanceof Error ? error.message : "请重新打开详情")); },
        }}
      />}
      <Modal
        isOpen={workOpen}
        onClose={() => setWorkOpen(false)}
        title={workflowAction === "reassign" ? "转交他人" : "新增任务"}
        maxWidth="4xl"
      >
        <form onSubmit={handleWorkflowSubmit} className="work-order-dialog space-y-4">


          {workflowAction === "convert" && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)]">任务配置 ({subTasks.length})</span>
                <button
                  type="button"
                  onClick={() => setSubTasks([...subTasks, { taskType: "", assignee: "", expectedDueDate: selected?.expectedCompleteDate || "", note: "", media: [] }])}
                  className="px-2.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-main)] text-xs text-[var(--primary)] font-medium hover:bg-[var(--bg-hover)]"
                >
                  + 增加任务
                </button>
              </div>
              {subTasks.map((t, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] relative">
                  <div className="mb-4 flex items-center justify-between border-b border-[var(--border-main)] pb-4">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">任务 #{idx + 1}</span>
                    {subTasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSubTasks(subTasks.filter((_, i) => i !== idx))}
                        className="text-[var(--danger)] text-xs hover:underline"
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
                  <label className="work-order-dialog-field block min-w-0 text-xs text-[var(--text-muted)] lg:col-span-3">
                    任务类型 *
                      <Select
                      allowClear
                      aria-label="任务类型 *"
                      className="w-full"
                      value={t.taskType || undefined}
                      placeholder="选择任务类型"
                      options={taskTypes.map((item) => ({ label: item, value: item }))}
                      onChange={(val) => {
                        setSubTasks(subTasks.map((item, i) => i === idx ? { ...item, taskType: val } : item));
                      }}
                    />
                  </label>
                  <div className="min-w-0 lg:col-span-3 [&>label]:block">
                  <EmployeeSearchSelect label="任务负责人 *" value={t.assignee} employees={employees} placeholder="搜索姓名或职位" onChange={(val) => setSubTasks(subTasks.map((item, i) => i === idx ? { ...item, assignee: val } : item))} />
                  </div>
                  <div className="min-w-0 lg:col-span-2"><DateField label="期望完成时间" value={t.expectedDueDate} onChange={(value) => setSubTasks(subTasks.map((item, i) => i === idx ? { ...item, expectedDueDate: value } : item))} /></div>
                  <label className="work-order-dialog-field block min-w-0 text-xs text-[var(--text-muted)] lg:col-span-4">
                    任务描述
                    <Input
                      value={t.note}
                      onChange={(e) => setSubTasks(subTasks.map((item, i) => i === idx ? { ...item, note: e.target.value } : item))}
                      placeholder="请输入任务描述说明..."
                      className="w-full"
                    />
                  </label>
                  </div>
                  <div className="mt-4">
                    <FlowAttachmentPicker
                      media={t.media}
                      onChange={(updater) => setSubTasks((items) => items.map((item, itemIndex) => itemIndex === idx ? { ...item, media: typeof updater === "function" ? updater(item.media) : updater } : item))}
                      onPick={(event) => void onTaskMedia(idx, event)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {workflowAction === "reassign" && (
            <>
              <EmployeeSearchSelect label="指定负责人 *" value={reassignAssignee} employees={employees} placeholder="搜索姓名或职位" onChange={setReassignAssignee} />
              <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">
                转交原因 *
                <Input.TextArea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  rows={3}
                  placeholder="请输入转交原因及交接说明..."
                  required
                />
              </label>
              <FlowAttachmentPicker media={flowMedia} onChange={setFlowMedia} onPick={onFlowMedia} />
            </>
          )}

          {workflowAction === "memo" && (
            <>
              <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">
                个人备忘内容 *
                <Input.TextArea
                  value={memoContent}
                  onChange={(e) => setMemoContent(e.target.value)}
                  rows={4}
                  placeholder="记录个人备忘信息或处理心得..."
                  required
                />
              </label>
              <FlowAttachmentPicker media={flowMedia} onChange={setFlowMedia} onPick={onFlowMedia} />
              <p className="text-[11px] text-[var(--text-muted)]">个人备忘仅作者可见，不改变事项状态。</p>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
            <button
              type="button"
              onClick={() => setWorkOpen(false)}
              disabled={workflowSubmitting}
              className="h-9 px-4 rounded-lg border border-[var(--border-main)] text-xs text-[var(--text-body)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={workflowSubmitting}
              className="h-9 px-4 rounded-lg bg-[var(--primary)] text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {workflowSubmitting ? "处理中…" : "确认"}
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={completeModalOpen} onClose={() => { if (!completeSubmitting) setCompleteModalOpen(false); }} title="事项完成">
        <form onSubmit={submitComplete} className="work-order-dialog space-y-4">
          <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">指定负责人<input aria-label="指定负责人" className="mt-1 w-full rounded border border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-2 text-sm" value={selected?.creatorName || "未记录"} readOnly /></label>
          <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">事项备注<RichTextEditor editor={completeEditor} size="work-order" value={completeNote} htmlValue={completeNoteHtml} onInput={(text, html) => { setCompleteNote(text); setCompleteNoteHtml(html); }} placeholder="请输入事项完成备注" /></label>
          <FlowAttachmentPicker media={flowMedia} onChange={setFlowMedia} onPick={onFlowMedia} />
          <div className="flex justify-end gap-2 border-t border-[var(--border-main)] pt-3"><button type="button" onClick={() => setCompleteModalOpen(false)} disabled={completeSubmitting} className="h-9 px-4 rounded-lg border border-[var(--border-main)] text-xs">取消</button><button type="submit" disabled={completeSubmitting} className="h-9 px-4 rounded-lg bg-[var(--primary)] text-xs font-semibold text-white disabled:opacity-60">{completeSubmitting ? "提交中…" : "确认完成"}</button></div>
        </form>
      </Modal>
      <Modal
        isOpen={!!reasonType}
        onClose={() => setReasonType(null)}
        title={reasonType === "hold" ? "事项搁置" : "事项驳回"}
      >
        <form onSubmit={transition} className="work-order-dialog space-y-4">
          {reasonType === "reject" && (
            <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">
              驳回原因 *
              <Select allowClear aria-label="驳回原因 *" className="w-full" value={rejectCategory || undefined} onChange={(value) => setRejectCategory(value ?? "")} placeholder="请选择驳回原因" options={availableRejectReasons.map((reasonOpt) => ({label:reasonOpt,value:reasonOpt}))} />
            </label>
          )}

          <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">
            {reasonType === "reject" ? "驳回详细说明 *" : "搁置原因说明 *"}
            <Input.TextArea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder={reasonType === "reject" ? "请输入详细驳回说明或补充建议..." : "请输入搁置原因说明..."}
              required
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-[var(--border-main)] pt-3">
            <button
              type="button"
              onClick={() => setReasonType(null)}
              className="h-9 px-4 rounded-lg border border-[var(--border-main)] text-xs text-[var(--text-body)]"
            >
              取消
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-[var(--primary)] text-xs font-semibold text-white"
            >
              确认
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={ratingModalOpen} onClose={() => { if (!acceptanceSubmitting) setRatingModalOpen(false); }} title="验收评价">
        <form className="work-order-dialog space-y-4" onSubmit={(event) => { event.preventDefault(); void passAcceptance(); }}>
          <p className="text-sm text-[var(--text-primary)]">{selected?.title}</p>
          <p className="text-xs text-[var(--text-muted)]">请选择星级，确认评价后事项将变为已完成，评价会记录在事项全历程中。</p>
          <div className="space-y-2"><div className="text-sm">满意度 <span className="text-[var(--danger)]">*</span></div><Rate aria-label="验收满意度" count={5} value={acceptanceRating} onChange={setAcceptanceRating} disabled={acceptanceSubmitting} /><span className="ml-3 text-xs text-[var(--text-muted)]">{acceptanceRating ? `${acceptanceRating} 星` : "请选择星级"}</span></div>
          <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">评价内容（选填）<Input.TextArea aria-label="评价内容" rows={4} maxLength={500} showCount value={acceptanceComment} onChange={(event) => setAcceptanceComment(event.target.value)} disabled={acceptanceSubmitting} placeholder="说说本次处理的质量、效率或改进建议" /></label>
          <div className="flex justify-end gap-2 border-t border-[var(--border-main)] pt-4"><Button aria-label="取消评价" disabled={acceptanceSubmitting} onClick={() => setRatingModalOpen(false)}>取消</Button><Button type="primary" htmlType="submit" loading={acceptanceSubmitting} disabled={!acceptanceRating || acceptanceSubmitting}>确认评价并完成</Button></div>
        </form>
      </Modal>
      <Modal
        isOpen={acceptanceModalOpen}
        onClose={() => setAcceptanceModalOpen(false)}
        title="验收未通过"
      >
        <form onSubmit={submitAcceptanceFailed} className="work-order-dialog space-y-4">
          <p className="text-xs text-[var(--text-muted)]">请选择需要退回的已完成任务，事项将恢复为“处理中”并交回该任务负责人。</p>
          <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">
            退回任务
            <Select className="w-full" showSearch optionFilterProp="label" value={acceptanceWorkItemId || undefined} options={workItems.filter((item) => item.status === "已完成" || item.assistanceTaskStatus === "COMPLETED").map((item) => ({ label: `${item.title} · ${item.assigneeName || "未分配"}`, value: item.id }))} onChange={(value) => { setAcceptanceWorkItemId(value); const item = workItems.find((candidate) => candidate.id === value); setAcceptanceTaskOwnerId(employees.find((person) => person.name === item?.assigneeName)?.id || ""); }} placeholder="请选择验收未通过的任务" disabled={acceptanceSubmitting} />
          </label>
          <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">
            指派负责人
            <Select className="w-full" showSearch optionFilterProp="label" value={acceptanceTaskOwnerId || undefined} options={employeeSelectOptions(employees, 'id')} onChange={setAcceptanceTaskOwnerId} placeholder="请选择退回负责人" disabled={acceptanceSubmitting} />
          </label>
          <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">
            未通过原因 *
            <Input.TextArea value={acceptanceReason} onChange={(event) => setAcceptanceReason(event.target.value)} rows={4} placeholder="请说明需要补充或修正的内容" required />
          </label>
          <FlowAttachmentPicker media={flowMedia} onChange={setFlowMedia} onPick={onFlowMedia} />
          <div className="flex justify-end gap-2 border-t border-[var(--border-main)] pt-3">
            <button type="button" onClick={() => setAcceptanceModalOpen(false)} disabled={acceptanceSubmitting} className="h-9 px-4 rounded-lg border border-[var(--border-main)] text-xs text-[var(--text-body)]">取消</button>
            <button type="submit" disabled={acceptanceSubmitting} className="h-9 px-4 rounded-lg bg-[var(--danger)] text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{acceptanceSubmitting ? "提交中…" : "确认退回"}</button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={reopenModalOpen}
        onClose={() => { if (!reopenSubmitting) setReopenModalOpen(false); }}
        title="重新开启事项"
      >
        <form onSubmit={submitReopen} className="work-order-dialog space-y-4">
          <p className="text-xs text-[var(--text-muted)]">历史事项将恢复为待处理，提交所选处理人接收，并保留原有历程记录。</p>
          <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">
            处理人
            <Select className="w-full" showSearch optionFilterProp="label" value={reopenAssigneeId || undefined} options={employeeSelectOptions(employees, 'id')} onChange={setReopenAssigneeId} disabled={reopenSubmitting} placeholder="请选择处理人" />
          </label>
          <label className="work-order-dialog-field text-xs text-[var(--text-muted)]">
            重开原因
            <Input.TextArea value={reopenReason} disabled={reopenSubmitting} maxLength={2000} onChange={(event) => setReopenReason(event.target.value)} rows={4} placeholder="请输入重新开启原因" />
          </label>
          <div className="flex justify-end gap-2 border-t border-[var(--border-main)] pt-3">
            <button type="button" onClick={() => setReopenModalOpen(false)} disabled={reopenSubmitting} className="h-9 px-4 rounded-lg border border-[var(--border-main)] text-xs text-[var(--text-body)] disabled:opacity-50">取消</button>
            <button type="submit" disabled={reopenSubmitting} className="h-9 px-4 rounded-lg bg-[var(--primary)] text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{reopenSubmitting ? "提交中…" : "确认重开"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
