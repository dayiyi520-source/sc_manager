import React, { useEffect, useMemo, useRef, useState } from "react";
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
  MessageSquareText,
  WifiOff,
  Headphones,
  Truck,
  HelpCircle,
  ListFilter,
  PenSquare,
  UserRound,
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
} from "lucide-react";
import { Pagination } from "../common/Pagination";
import { useApp } from "../../context/AppContext";
import { StatCard, StatusTag, Drawer, Modal } from "../common/UIComponents";
import { requirementRepository } from "../../services/requirementRepository";
import { RequirementActionButtons } from "../product/RequirementActionButtons";
import { WorkflowAssigneeSelect } from "../product/WorkflowAssigneeSelect";
import { RichTextEditor } from "../product/RichTextEditor";
import type {
  EmployeeOption,
  RequirementEvent,
  RequirementMedia,
  RequirementTask,
  RequirementTaskType,
  RequirementWorkItem,
  WorkOrderType,
} from "../../types";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { getRejectReasonsForType } from "../../constants/rejectReasons";
import { TASK_PAGE_BY_TYPE } from "../../constants/taskTypes";
import { DateField } from "../common";

const statuses: RequirementTask["status"][] = [
  "待处理",
  "处理中",
  "已搁置",
  "已驳回",
  "已完成",
];
const taskTypes: RequirementTaskType[] = [
  "产品需求",
  "数据需求",
  "缺陷管理",
  "设计任务",
  "售前任务",
  "交付任务",
  "运维任务",
  "研发任务",
];
const opportunityStagesBeforeWin = new Set(["发现商机", "需求确认", "方案设计", "商务谈判", "招投标"]);
const taskTargetPages: Record<RequirementTaskType, string> = TASK_PAGE_BY_TYPE;
const workOrderCards: Array<{ type: WorkOrderType; description: string; icon: React.ReactNode }> = [
  { type: "客户诉求", description: "收集客户反馈、业务需求与改进建议", icon: <MessageSquareText className="h-6 w-6" /> },
  { type: "线上问题", description: "记录线上故障、异常现象与影响范围", icon: <WifiOff className="h-6 w-6" /> },
  { type: "售前支持", description: "处理方案咨询、演示和售前技术支持", icon: <Headphones className="h-6 w-6" /> },
  { type: "交付支持", description: "跟进项目实施、部署与交付保障事项", icon: <Truck className="h-6 w-6" /> },
  { type: "其他问题", description: "比如个人记录、公司物料、建议等非业务问题", icon: <HelpCircle className="h-6 w-6" /> },
];

const specialFieldLabels: Record<string, string> = {
  projectName: "所属项目", requestType: "诉求类型", requestSource: "诉求来源",
  productName: "关联产品", severity: "严重程度", frequency: "发生频率",
  opportunityName: "关联商机", supportType: "支持类型", durationDays: "预计时长（天）",
  progressStage: "推进阶段", other: "其他说明", problemSource: "问题来源",
  expectedResult: "期望结果", problemType: "类型",
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

const eventMetadata = (value: unknown): Record<string, string> => {
  if (value && typeof value === "object") return value as Record<string, string>;
  if (typeof value !== "string") return {};
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; }
};


export const isWorkOrderInScope = (
  item: Pick<RequirementTask, "ownerName" | "creatorName">,
  scope: "all" | "mine_created" | "mine_owned",
  currentUserName: string,
) => scope === "all"
  ? samePerson(item.ownerName, currentUserName) || samePerson(item.creatorName, currentUserName)
  : scope === "mine_created"
    ? samePerson(item.creatorName, currentUserName)
    : samePerson(item.ownerName, currentUserName);

const SearchSelect: React.FC<{ label: string; value: string; options: string[]; placeholder?: string; onChange: (value: string) => void }> = ({ label, value, options, placeholder, onChange }) => {
  const [open, setOpen] = useState(false);
  const query = value.trim().toLocaleLowerCase();
  const filtered = options.filter((item) => item.toLocaleLowerCase().includes(query)).slice(0, 8);
  return <label className="relative text-xs text-[var(--text-muted)]">{label}
    <input value={value} onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value); setOpen(true); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)} placeholder={placeholder} className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
    {open && filtered.length > 0 && <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] py-1 shadow-lg">{filtered.map((item) => <button type="button" key={item} onMouseDown={() => onChange(item)} className="block w-full px-3 py-2 text-left text-xs text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)]">{item}</button>)}</div>}
  </label>;
};



export const RequirementPoolView: React.FC = () => {
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
    setRequirementTaskDraft,
  } = useApp();
  const [tab, setTab] = useState<"create" | "list">("create");
  const [creating, setCreating] = useState(false);
  const [workOrderType, setWorkOrderType] = useState<WorkOrderType | null>(null);
  const [selected, setSelected] = useState<RequirementTask | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "history">("info");
  const [events, setEvents] = useState<RequirementEvent[]>([]);
  const [workItems, setWorkItems] = useState<RequirementWorkItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [scope, setScope] = useState<"all" | "mine_created" | "mine_owned">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<WorkOrderType | "all">("all");
  const [filterMode, setFilterMode] = useState<"type" | "mine">("type");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [title, setTitle] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [requirementPriority, setRequirementPriority] = useState<
    RequirementTask["priority"] | ""
  >("");
  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [media, setMedia] = useState<RequirementMedia[]>([]);
  const [specialFields, setSpecialFields] = useState<Record<string, string>>({});
  const [workOpen, setWorkOpen] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<"convert" | "reassign" | "memo">("convert");
  const [subTasks, setSubTasks] = useState<Array<{ taskType: RequirementTaskType | ""; assignee: string; expectedDueDate: string; note: string }>>([{ taskType: "", assignee: "", expectedDueDate: "", note: "" }]);
  const [reassignAssignee, setReassignAssignee] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [memoContent, setMemoContent] = useState("");
  const [reasonType, setReasonType] = useState<"hold" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [rejectCategory, setRejectCategory] = useState("");
  const editor = useRef<HTMLDivElement>(null);

  const currentWorkOrderType = selected?.workOrderType || selected?.taskType || selected?.requirementType || "通用/其他";
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
    setOwnerName("");
    setRequirementPriority("");
    setCustomerId("");
    setCustomerQuery("");
    setDueDate("");
    setDescription("");
    setDescriptionHtml("");
    setMedia([]);
    setSpecialFields({});
  };
  const openCreate = (type?: WorkOrderType) => {
    reset();
    setWorkOrderType(type || null);
    setCreating(true);
    setTab("create");
  };
  const openCreateHome = () => {
    setCreating(false);
    setWorkOrderType(null);
    setTab("create");
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
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedEmployee = employees.find(
      (item) => item.name === ownerName.trim(),
    );
    const descriptionText = description || editor.current?.innerText || "";
    if (
      !title.trim() ||
      !selectedEmployee ||
      !descriptionText.trim()
    ) {
      addToast("warning", "请补充工单标题、负责人和工单描述");
      return;
    }
    const customer = customers.find((item) => item.id === customerId)
      || customers.find((item) => item.name.trim().toLocaleLowerCase() === customerQuery.trim().toLocaleLowerCase());
    const saved = await addRequirementTask({
      title: title.trim(),
      description: descriptionText,
      descriptionHtml: descriptionHtml || editor.current?.innerHTML || "",
      media,
      ownerName: selectedEmployee.name,
      department: selectedEmployee.department,
      customerId: customer?.id || customerId || undefined,
      customerName: customer?.name,
      priority: requirementPriority || undefined,
      workOrderType: workOrderType || "其他问题",
      specialFields,
      dueDate: dueDate || undefined,
    });
    if (!saved) return;
    setCreating(false);
    setTypeFilter(workOrderType || "all");
    setFilterMode("type");
    setScope("all");
    setPage(1);
    setTab("list");
  };
  const openDetail = async (item: RequirementTask) => {
    setSelected({ ...item, media: normalizeMedia(item.media) });
    setDetailTab("info");
    try {
      const detail = await requirementRepository.detail(item.id);
      setEvents(Array.isArray(detail.events) ? detail.events : []);
      setWorkItems(Array.isArray(detail.workItems) ? detail.workItems : []);
    } catch {
      setEvents(Array.isArray(item.events) ? item.events : []);
      setWorkItems([]);
    }
  };
  const handleWorkflowSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
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
      const singleTask = taskInputs[0];
      if (subTasks.length === 1 && singleTask.task.taskType === "产品需求") {
        setRequirementTaskDraft({ title: selected.title, description: singleTask.task.note || selected.description, expectedGoal: selected.expectedGoal || eventMetadata(selected.specialFields).expectedResult, ownerName: singleTask.assignee!.name, priority: selected.priority, productLineName: selected.productLineName, customerName: selected.customerName, dueDate: singleTask.task.expectedDueDate || selected.dueDate, sourceWorkOrderIds: [selected.id], requirementType: "业务需求" });
        setRequirementTasks((list) => list.map((item) => item.id === selected.id ? { ...item, status: "处理中" as RequirementTask["status"], assignedOwnerName: singleTask.assignee!.name } : item));
        setSelected((item) => item ? { ...item, status: "处理中" as RequirementTask["status"], assignedOwnerName: singleTask.assignee!.name } : item);
        setWorkOpen(false);
        openPageTab("prod_req_tasks");
        addToast("success", "已打开需求任务创建界面", "工单信息已自动带入，请确认后保存");
        return;
      }
      let results: Array<{ task: typeof singleTask.task; assignee: NonNullable<typeof singleTask.assignee>; result: Awaited<ReturnType<typeof requirementRepository.createWorkItem>> }>;
      try {
        results = await Promise.all(taskInputs.map(async ({ task, assignee }) => ({ task, assignee: assignee!, result: await requirementRepository.createWorkItem(selected.id, { taskType: task.taskType!, assigneeName: assignee!.name, note: task.note }) })));
      } catch {
        addToast("error", "下游任务同步失败", "已创建的任务会保留在关联工单中，请在详情中重试失败任务");
        return;
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
      addToast("success", "已创建下游工单", `已生成 ${localItems.length} 条任务，关联工单已自动建立`);
    } else if (workflowAction === "reassign") {
      const selectedAssignee = employees.find((item) => item.name.trim().toLocaleLowerCase() === reassignAssignee.trim().toLocaleLowerCase());
      if (!selectedAssignee) {
        addToast("warning", "请选择新的转派负责人", "请输入负责人姓名并从下拉列表中选择");
        return;
      }
      if (!reassignReason.trim()) {
        addToast("warning", "请输入转派原因说明");
        return;
      }
      const next = {
        ...selected,
        ownerName: selectedAssignee.name,
        status: "处理中" as RequirementTask["status"],
        events: [
          ...(selected.events || []),
          {
            id: `event-${Date.now()}`,
            eventType: "转派",
            fromStatus: selected.status,
            toStatus: "处理中",
            reason: `转派给 ${selectedAssignee.name}：${reassignReason.trim()}`,
            operatorName: currentUser.name,
            createdAt: now,
          },
        ],
      };
      setRequirementTasks((list) => list.map((item) => item.id === selected.id ? next : item));
      setSelected(next);
      setWorkOpen(false);
      addToast("success", "工单转派成功", `已成功转派给 ${selectedAssignee.name}`);
    } else if (workflowAction === "memo") {
      if (!memoContent.trim()) {
        addToast("warning", "请输入个人备忘录内容");
        return;
      }
      const next = {
        ...selected,
        status: "已完成" as RequirementTask["status"],
        events: [
          ...(selected.events || []),
          {
            id: `event-${Date.now()}`,
            eventType: "个人备忘录",
            fromStatus: selected.status,
            toStatus: "已完成",
            reason: memoContent.trim(),
            operatorName: currentUser.name,
            createdAt: now,
          },
        ],
      };
      setRequirementTasks((list) => list.map((item) => item.id === selected.id ? next : item));
      setSelected(next);
      setWorkOpen(false);
      addToast("success", "已保存为个人备忘录并归档工单");
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
    const now = new Date().toISOString();
    const nextStatus = reasonType === "hold" ? "已搁置" : "已驳回";
    let persisted = true;
    try {
      await requirementRepository.transition(
        selected.id,
        reasonType,
        finalReason,
      );
    } catch {
      persisted = false;
    }
    if (!persisted) {
      addToast("error", "工单操作失败", "服务未确认本次流转，请稍后重试");
      return;
    }
    const eventItem: RequirementEvent = {
      id: `event-${Date.now()}`,
      eventType: reasonType === "hold" ? "搁置" : "驳回",
      fromStatus: selected.status,
      toStatus: nextStatus,
      reason: finalReason,
      operatorName: currentUser.name,
      createdAt: now,
    };
    const next = {
      ...selected,
      status: nextStatus as RequirementTask["status"],
      events: [...(selected.events || []), eventItem],
    };
    setRequirementTasks((list) =>
      list.map((item) => (item.id === selected.id ? next : item)),
    );
    setSelected(next);
    setEvents((list) => [...list, eventItem]);
    setReasonType(null);
    setReason("");
    setRejectCategory("");
    addToast(
      "success",
      `工单${nextStatus}`,
      persisted ? "流转记录已保存" : "后端暂不可用，已在当前会话记录",
    );
  };
  const filtered = useMemo(
    () =>
      requirementTasks.filter((item) => {
        const q = query.toLowerCase();
        const inScope = filterMode !== "mine" || isWorkOrderInScope(item, scope, currentUser.name);
        return (
          inScope &&
          (!q ||
            [
              item.title,
              item.description,
              item.ownerName,
              item.productLineName,
              item.customerName,
            ].some((value) => value?.toLowerCase().includes(q))) &&
          (product === "all" || item.productLineName === product) &&
          (priority === "all" || item.priority === priority) &&
          (status === "all" || item.status === status) &&
          (filterMode === "type"
            ? typeFilter === "all" || (item.workOrderType || "其他问题") === typeFilter
            : isWorkOrderInScope(item, scope, currentUser.name))
        );
      }),
    [
      requirementTasks,
      query,
      product,
      priority,
      status,
      scope,
      typeFilter,
      filterMode,
      currentUser.name,
    ],
  );
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [query, product, priority, status, scope, typeFilter, filterMode, pageSize]);
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
    (item) => item.status === "已驳回",
  ).length;
  const typeStats = workOrderCards.map(({ type }) => {
    const items = requirementTasks.filter((item) => (item.workOrderType || "其他问题") === type);
    return { type, total: items.length, pending: items.filter((item) => item.status === "待处理").length, processing: items.filter((item) => item.status === "处理中").length, handled: items.filter((item) => ["已完成", "已搁置"].includes(item.status)).length };
  });
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
    (item) => isToday(item.createdAt) && item.status === "已驳回",
  ).length;
  const taskLocked = Boolean(
    selected &&
    (selected.taskId ||
      workItems.length > 0 ||
      ["处理中", "已驳回", "已完成"].includes(selected.status)),
  );
  const selectedMedia = normalizeMedia(selected?.media);
  const cardSubText = (count: number) => `今日新增 +${count}`;
  const fieldClass =
    "mt-1 w-full h-10 px-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20";
  const selectFieldClass = (value: string) =>
    `mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 ${value ? "text-[var(--text-primary)]" : "!text-[var(--text-muted)]"}`;
  const filterClass =
    "h-10 px-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]";
  const fields = <div className="work-order-form grid grid-cols-1 gap-4">
    <label className="text-xs text-[var(--text-muted)]">
      工单标题 *
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="请输入工单标题，简明描述问题或诉求"
        className={fieldClass}
      />
    </label>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <SearchSelect label="负责人 *" value={ownerName} options={employees.map((item) => item.name)} placeholder="输入负责人姓名搜索并选择" onChange={setOwnerName} />
      <SearchSelect label="关联客户" value={customerQuery} options={customers.map((item) => item.name)} placeholder="输入客户名称模糊搜索并选择" onChange={(name) => { setCustomerQuery(name); setCustomerId(customers.find((item) => item.name === name)?.id || ""); }} />
      <label className="text-xs text-[var(--text-muted)]">
        优先级
        <select value={requirementPriority} onChange={(event) => setRequirementPriority(event.target.value as RequirementTask["priority"])} className={selectFieldClass(requirementPriority)}>
          <option value="">请选择优先级</option>
          {["紧急", "高", "中", "低"].map((item) => <option key={item} value={item} className="text-[var(--text-primary)]">{item}</option>)}
        </select>
      </label>
      <DateField label="期望完成时间" value={dueDate} onChange={setDueDate} />
    </div>
    {workOrderType && (
      <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">业务参数设置</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {workOrderType === "客户诉求" && <>
            <SearchSelect label="所属项目" value={specialFields.projectName || ""} options={biddings.filter((item) => item.result === "中标" || item.status === "中标").map((item) => item.projectName || item.name || "")} placeholder="输入中标项目名称搜索并选择" onChange={(value) => setSpecialFields((current) => ({ ...current, projectName: value }))} />
            <label className="text-xs text-[var(--text-muted)]">诉求类型<select value={specialFields.requestType || ""} onChange={(event) => setSpecialFields((current) => ({ ...current, requestType: event.target.value }))} className={selectFieldClass(specialFields.requestType || "")}><option value="">请选择诉求类型</option>{["新功能","线上问题","数据需求","技术难题","其他"].map((item) => <option key={item} value={item} className="text-[var(--text-primary)]">{item}</option>)}</select></label>
            <label className="text-xs text-[var(--text-muted)]">诉求来源<input value={specialFields.requestSource || ""} placeholder="请输入诉求来源" onChange={(event) => setSpecialFields((current) => ({ ...current, requestSource: event.target.value }))} className={fieldClass} /></label>
          </>}
          {workOrderType === "线上问题" && <>
            <SearchSelect label="关联产品" value={specialFields.productName || ""} options={productLines.map((item) => item.name)} placeholder="输入产品名称搜索并选择" onChange={(value) => setSpecialFields((current) => ({ ...current, productName: value }))} />
            <label className="text-xs text-[var(--text-muted)]">严重程度<select value={specialFields.severity || ""} onChange={(event) => setSpecialFields((current) => ({ ...current, severity: event.target.value }))} className={selectFieldClass(specialFields.severity || "")}><option value="">请选择严重程度</option>{["P0-阻断主流程","P1-功能逻辑异常","P2-一般缺陷","P3-轻微缺陷"].map((item) => <option key={item} value={item} className="text-[var(--text-primary)]">{item}</option>)}</select></label>
            <label className="text-xs text-[var(--text-muted)]">发生频率<select value={specialFields.frequency || ""} onChange={(event) => setSpecialFields((current) => ({ ...current, frequency: event.target.value }))} className={selectFieldClass(specialFields.frequency || "")}><option value="">请选择发生频率</option>{["必现（100%）","高频发生","偶现（特点条件）","环境相关偶发"].map((item) => <option key={item} value={item} className="text-[var(--text-primary)]">{item}</option>)}</select></label>
          </>}
          {workOrderType === "售前支持" && <>
            <SearchSelect label="关联商机" value={specialFields.opportunityName || ""} options={opportunities.filter((item) => opportunityStagesBeforeWin.has(item.stage)).map((item) => item.name)} placeholder="输入商机名称搜索并选择" onChange={(value) => setSpecialFields((current) => ({ ...current, opportunityName: value, opportunityId: opportunities.find((item) => item.name === value)?.id || "" }))} />
            <label className="text-xs text-[var(--text-muted)]">支持类型<select value={specialFields.supportType || ""} onChange={(event) => setSpecialFields((current) => ({ ...current, supportType: event.target.value }))} className={selectFieldClass(specialFields.supportType || "")}><option value="">请选择支持类型</option>{["现场演示/答疑","需求沟通","方案设计","招投标标书协同","商务洽谈"].map((item) => <option key={item} value={item} className="text-[var(--text-primary)]">{item}</option>)}</select></label>
            <label className="text-xs text-[var(--text-muted)]">预计时长（天）<input type="number" min="0" value={specialFields.durationDays || ""} placeholder="请输入预计天数" onChange={(event) => setSpecialFields((current) => ({ ...current, durationDays: event.target.value }))} className={fieldClass} /></label>
          </>}
          {workOrderType === "交付支持" && <>
            <SearchSelect label="所属项目" value={specialFields.projectName || ""} options={biddings.filter((item) => item.result === "中标" || item.status === "中标").map((item) => item.projectName || item.name || "")} placeholder="输入中标项目名称搜索并选择" onChange={(value) => setSpecialFields((current) => ({ ...current, projectName: value }))} />
            <label className="text-xs text-[var(--text-muted)]">推进阶段<input value={specialFields.progressStage || ""} placeholder="请输入当前推进阶段" onChange={(event) => setSpecialFields((current) => ({ ...current, progressStage: event.target.value }))} className={fieldClass} /></label>
            <label className="text-xs text-[var(--text-muted)]">其他说明<input value={specialFields.other || ""} placeholder="请输入其他交付说明" onChange={(event) => setSpecialFields((current) => ({ ...current, other: event.target.value }))} className={fieldClass} /></label>
          </>}
          {workOrderType === "其他问题" && <>
            <label className="text-xs text-[var(--text-muted)]">问题来源<input value={specialFields.problemSource || ""} placeholder="请输入问题来源" onChange={(event) => setSpecialFields((current) => ({ ...current, problemSource: event.target.value }))} className={fieldClass} /></label>
            <label className="text-xs text-[var(--text-muted)]">期望结果<input value={specialFields.expectedResult || ""} placeholder="请输入期望达到的结果" onChange={(event) => setSpecialFields((current) => ({ ...current, expectedResult: event.target.value }))} className={fieldClass} /></label>
            <label className="text-xs text-[var(--text-muted)]">类型<select value={specialFields.problemType || ""} onChange={(event) => setSpecialFields((current) => ({ ...current, problemType: event.target.value }))} className={selectFieldClass(specialFields.problemType || "")}><option value="">请选择问题类型</option>{["意见反馈","方向研讨","其他"].map((item) => <option key={item} value={item} className="text-[var(--text-primary)]">{item}</option>)}</select></label>
          </>}
        </div>
      </div>
    )}
    <div>
      <span className="text-xs text-[var(--text-muted)]">工单描述 *</span>
      <RichTextEditor editor={editor} onInput={(text, html) => { setDescription(text); setDescriptionHtml(html); }} />
      <div className="mt-2 flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-body)]">
          <Paperclip className="h-4 w-4" />
          添加文档附件（支持 TXT/DOC/EXCEL/PDF 文档）
          <input type="file" accept=".txt,.doc,.docx,.xls,.xlsx,.pdf" multiple className="sr-only" onChange={onMedia} />
        </label>
        {media.length > 0 && <div className="flex flex-wrap gap-2">{media.map((item) => <span key={item.id} className="inline-flex items-center gap-1 rounded border border-[var(--border-main)] px-2 py-1 text-xs text-[var(--text-body)]">{item.name}<button type="button" title="移除附件" aria-label="移除附件" onClick={() => setMedia((items) => items.filter((mediaItem) => mediaItem.id !== item.id))}><X className="h-3 w-3" /></button></span>)}</div>}
      </div>
    </div>
  </div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            role="tab"
            aria-selected={tab === "create"}
            onClick={() => setTab("create")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "create"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <PenSquare className="w-4 h-4" />
            提工单
          </button>
          <button
            role="tab"
            aria-selected={tab === "list"}
            onClick={() => setTab("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "list"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ListFilter className="w-4 h-4" />
            工单列表
          </button>
        </div>
      </div>
      {tab === "create" && (
        <section className="dark-panel rounded-xl p-6">
          {!creating ? (
            <div className="flex min-h-[560px] flex-col items-center justify-center text-center">
              <div className="relative flex w-full max-w-xl items-center justify-center pb-2">
                <div className="relative -top-12 flex flex-col items-center gap-2">
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    每一处精微调整，都在点亮更广的世界。
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Every subtle adjustment illuminates a wider world.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid w-full max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {workOrderCards.map((card) => (
                  <button key={card.type} type="button" onClick={() => openCreate(card.type)} className="group min-h-36 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30">
                    <span className="mb-3 inline-flex items-center justify-center text-blue-600 dark:text-blue-400 transition">{card.icon}</span>
                    <span className="block text-sm font-semibold text-[var(--text-primary)]">{card.type}</span>
                    <span className="mt-2 block text-xs leading-5 text-[var(--text-muted)]">{card.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={save} className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  {workOrderType || "提工单"}
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  提交后将会自动通知到负责人
                </p>
              </div>
              {fields}
              <div className="flex justify-end gap-2 border-t border-[var(--border-main)] pt-4">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="h-10 px-4 rounded-lg border border-[var(--border-main)] text-sm text-[var(--text-body)]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white"
                >
                  提交工单
                </button>
              </div>
            </form>
          )}
        </section>
      )}
      {tab === "list" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {typeStats.map((stat) => (
              <button key={stat.type} type="button" onClick={() => setTypeFilter(stat.type)} className="text-left">
                <StatCard title={stat.type} value={stat.total} unit="个" subText={`待处理 ${stat.pending} · 处理中 ${stat.processing} · 已处理 ${stat.handled}`} icon={<Inbox className="w-5 h-5" />} />
              </button>
            ))}
          </div>
          <div className="dark-panel rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 pb-1">
              <div className="inline-flex shrink-0 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-1" role="group" aria-label="列表筛选模式">
                <button type="button" title="按工单类型筛选" aria-label="按工单类型筛选" onClick={() => setFilterMode("type")} className={`flex h-8 w-9 items-center justify-center rounded-md transition ${filterMode === "type" ? "bg-[var(--bg-surface-soft)] text-[var(--active-text)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}><ListFilter className="h-4 w-4" /></button>
                <button type="button" title="查看与我有关" aria-label="查看与我有关" onClick={() => { setFilterMode("mine"); setScope("all"); }} className={`flex h-8 w-9 items-center justify-center rounded-md transition ${filterMode === "mine" ? "bg-[var(--bg-surface-soft)] text-[var(--active-text)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}><UserRound className="h-4 w-4" /></button>
              </div>
              <div className="inline-flex max-w-full flex-wrap items-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-1">
                {(filterMode === "type" ? [{ value: "all", label: "全部" }, ...workOrderCards.map((card) => ({ value: card.type, label: card.type }))] : [{ value: "all", label: "全部" }, { value: "mine_owned", label: "我负责的" }, { value: "mine_created", label: "我创建的" }]).map((item) => <button key={item.value} type="button" onClick={() => filterMode === "type" ? setTypeFilter(item.value as typeof typeFilter) : setScope(item.value as typeof scope)} className={`h-8 rounded-md px-4 text-xs font-semibold whitespace-nowrap transition ${(filterMode === "type" ? typeFilter === item.value : scope === item.value) ? "bg-[var(--bg-surface-soft)] text-[var(--active-text)] shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"}`}>{item.label}</button>)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索标题/客户/负责人"
                className="h-10 w-64 pl-9 pr-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]"
              />
            </div>
            {filterMode === "mine" && <select aria-label="类型" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className={`${filterClass} min-w-[130px] shrink-0`}><option value="all">类型</option>{workOrderCards.map((card) => <option key={card.type} value={card.type}>{card.type}</option>)}</select>}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${filterClass} min-w-[130px] shrink-0`}
            >
              <option value="all">状态</option>
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${filterClass} min-w-[130px] shrink-0`}><option value="all">优先级</option><option>紧急</option><option>高</option><option>中</option><option>低</option></select>
            <button
              type="button"
              onClick={openCreateHome}
              className="ml-auto h-10 px-4 shrink-0 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white"
            >
              <Plus className="mr-1 inline w-4 h-4" />
              提工单
            </button>
            </div>
          </div>
          <div className="dark-panel rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-main)] text-[var(--text-muted)]">
                    <th className="px-4 py-3">标题</th>
                    <th className="px-4 py-3">工单类型</th>
                    <th className="px-4 py-3">优先级</th>
                    <th className="px-4 py-3">关联客户</th>
                    <th className="px-4 py-3">负责人</th>
                    <th className="px-4 py-3">提出人</th>
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
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        <div className="flex items-start gap-2">
                          <Inbox className="mt-0.5 w-4 h-4 text-[var(--active-text)] shrink-0" />
                          <span className="max-w-[260px] line-clamp-2">
                            {item.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-body)]">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const typeCard = workOrderCards.find(c => c.type === item.workOrderType);
                            return typeCard ? <span className="text-[var(--text-muted)]">{typeCard.icon}</span> : null;
                          })()}
                          <span>{item.workOrderType || "历史工单"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag status={item.priority} />
                      </td>
                      <td className="px-4 py-3 text-[var(--text-body)]">
                        {item.customerName || "未关联"}
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
          onClose={() => setSelected(null)}
          hideSubtitle
          title="工单详情"
          subtitle={`${selected.productLineName} · 负责人：${selected.ownerName || "未分配"}`}
          footer={
            <div className="flex w-full justify-between">
              <RequirementActionButtons
                status={selected.status}
                hasWorkItem={taskLocked}
                onWork={() => { setWorkflowAction("convert"); setSubTasks([{ taskType: "", assignee: "", expectedDueDate: selected?.dueDate || "", note: "" }]); setReassignAssignee(""); setReassignReason(""); setMemoContent(""); setWorkOpen(true); }}
                onHold={() => setReasonType("hold")}
                onReject={() => setReasonType("reject")}
              />
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-9 px-4 rounded-lg border border-[var(--border-main)] text-xs text-[var(--text-body)]"
              >
                关闭
              </button>
            </div>
          }
        >
          <div className="mb-5 flex items-center gap-1 border-b border-[var(--border-main)]">
            <button type="button" onClick={() => setDetailTab("info")} className={`border-b-2 px-3 py-2 text-sm ${detailTab === "info" ? "border-[var(--primary)] text-[var(--active-text)]" : "border-transparent text-[var(--text-muted)]"}`}>工单信息</button>
            <button type="button" onClick={() => setDetailTab("history")} className={`border-b-2 px-3 py-2 text-sm ${detailTab === "history" ? "border-[var(--primary)] text-[var(--active-text)]" : "border-transparent text-[var(--text-muted)]"}`}>工单全历程</button>
          </div>
          <div className={`space-y-5 text-sm ${detailTab === "history" ? "hidden" : ""}`}>
            <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
              <div className="flex items-start justify-between gap-4"><h2 className="text-lg font-semibold text-[var(--text-primary)]">{selected.title}</h2><StatusTag status={selected.status} /></div>
              <div className="my-4 border-t border-[var(--border-main)]" />
              <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-[var(--text-muted)]">工单类型</span><p className="mt-1 text-[var(--text-primary)]">{selected.workOrderType || "历史工单"}</p></div>
              <div>
                <span className="text-xs text-[var(--text-muted)]">优先级</span>
                <div className="mt-1">
                  <StatusTag status={selected.priority} />
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)]">
                  关联客户
                </span>
                <p className="mt-1 text-[var(--text-primary)]">
                  {selected.customerName || "未关联"}
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)]">负责人</span>
                <p className="mt-1 text-[var(--text-primary)]">
                  {selected.ownerName || "未分配"}
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)]">提出人</span>
                <p className="mt-1 text-[var(--text-primary)]">
                  {selected.creatorName || selected.ownerName}
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)]">
                  期望完成时间
                </span>
                <p className="mt-1 text-[var(--text-primary)]">
                  {selected.dueDate || "未设置"}
                </p>
              </div>
            </div>
            {selected.specialFields && typeof selected.specialFields !== "string" && Object.keys(selected.specialFields).length > 0 && <><div className="my-4 border-t border-[var(--border-main)]" /><div className="grid grid-cols-2 gap-3">{Object.entries(selected.specialFields).filter(([, value]) => value).map(([key, value]) => <div key={key}><span className="text-xs text-[var(--text-muted)]">{specialFieldLabels[key] || key}</span><p className="mt-1 text-[var(--text-primary)]">{String(value)}</p></div>)}</div></>}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                工单详细描述
              </h3>
              <div
                className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-3 text-sm text-[var(--text-body)]"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(
                    selected.descriptionHtml ||
                      selected.description ||
                      "暂无描述",
                  ),
                }}
              />
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
            </div>
          </div>
          <div className={`space-y-5 text-sm ${detailTab === "info" ? "hidden" : ""}`}>
            <section><h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">工单全历程</h3>{events.length ? <div className="space-y-3">{events.map((item) => { const meta = eventMetadata(item.metadata); const targetPage = meta.targetPage; return <div key={item.id} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-3"><div className="flex justify-between gap-2"><b className="text-[var(--active-text)]">{item.eventType}</b><span className="text-[11px] text-[var(--text-muted)]">{item.createdAt?.slice(0, 16)}</span></div><div className="mt-1 text-[11px] text-[var(--text-muted)]">操作人：{item.operatorName || "未知"} · 指派负责人：{meta.assigneeName || "未指派"}</div>{item.reason && <p className="mt-2 text-xs">{item.reason}</p>} {meta.taskType && <><div className="my-3 border-t border-[var(--border-main)]" /><button type="button" className="text-left text-xs text-[var(--active-text)] hover:text-[var(--primary-hover)]" onClick={() => targetPage && openPageTab(targetPage as Parameters<typeof openPageTab>[0])}>{meta.taskType} · {meta.taskTitle || "关联任务"} <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></>}</div>; })}</div> : <p className="text-xs text-[var(--text-muted)]">暂无工单流转记录</p>}</section>
            <section><h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">解决过程记录</h3>{workItems.length ? workItems.map((item) => <div key={item.id} className="flex justify-between border-b border-[var(--border-main)] py-2 text-xs"><span>{item.taskType} · {item.title}</span><StatusTag status={item.status} /></div>) : <p className="text-xs text-[var(--text-muted)]">暂无解决过程记录</p>}</section>
          </div>
        </Drawer>
      )}
      <Modal
        isOpen={workOpen}
        onClose={() => setWorkOpen(false)}
        title="工单流转"
        maxWidth="4xl"
      >
        <form onSubmit={handleWorkflowSubmit} className="space-y-4">
          <label className="block text-xs text-[var(--text-muted)]">
            流转类型 *
            <select
              value={workflowAction}
              onChange={(e) => setWorkflowAction(e.target.value as typeof workflowAction)}
              className={fieldClass}
              required
            >
              <option value="convert">转任务</option>
              <option value="reassign">转派给他人</option>
              <option value="memo">个人备忘录</option>
            </select>
          </label>

          {workflowAction === "convert" && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)]">任务配置 ({subTasks.length})</span>
                <button
                  type="button"
                  onClick={() => setSubTasks([...subTasks, { taskType: "", assignee: "", expectedDueDate: selected?.dueDate || "", note: "" }])}
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
                  <label className="block min-w-0 text-xs text-[var(--text-muted)] lg:col-span-3">
                    任务类型 *
                    <select
                      value={t.taskType}
                      onChange={(e) => {
                        const val = e.target.value as RequirementTaskType;
                        setSubTasks(subTasks.map((item, i) => i === idx ? { ...item, taskType: val } : item));
                      }}
                      className={fieldClass}
                      required
                    >
                      <option value="">选择任务类型</option>
                      {taskTypes.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <div className="min-w-0 lg:col-span-3 [&>label]:block">
                  <WorkflowAssigneeSelect
                    label="任务负责人 *"
                    value={t.assignee}
                    options={employees.map((item) => item.name)}
                    placeholder="输入负责人姓名搜索并选择"
                    onChange={(val) => setSubTasks(subTasks.map((item, i) => i === idx ? { ...item, assignee: val } : item))}
                  />
                  </div>
                  <DateField label="期望完成时间" value={t.expectedDueDate} onChange={(value) => setSubTasks(subTasks.map((item, i) => i === idx ? { ...item, expectedDueDate: value } : item))} />
                  <label className="block min-w-0 text-xs text-[var(--text-muted)] lg:col-span-4">
                    任务描述
                    <input
                      type="text"
                      value={t.note}
                      onChange={(e) => setSubTasks(subTasks.map((item, i) => i === idx ? { ...item, note: e.target.value } : item))}
                      placeholder="请输入任务描述说明..."
                      className="mt-1 w-full h-10 px-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                    />
                  </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {workflowAction === "reassign" && (
            <>
              <WorkflowAssigneeSelect label="转派给负责人 *" value={reassignAssignee} options={employees.map((item) => item.name)} placeholder="输入新负责人姓名搜索并选择" onChange={setReassignAssignee} />
              <label className="block text-xs text-[var(--text-muted)]">
                转派原因说明 *
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  rows={3}
                  placeholder="请输入转派原因及交接说明..."
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                  required
                />
              </label>
            </>
          )}

          {workflowAction === "memo" && (
            <>
              <label className="block text-xs text-[var(--text-muted)]">
                个人备忘内容 *
                <textarea
                  value={memoContent}
                  onChange={(e) => setMemoContent(e.target.value)}
                  rows={4}
                  placeholder="记录个人备忘信息或处理心得..."
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                  required
                />
              </label>
              <p className="text-[11px] text-[var(--text-muted)]">保存为个人备忘录后，工单将归档或标记为已完成状态。</p>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
            <button
              type="button"
              onClick={() => setWorkOpen(false)}
              className="h-9 px-4 rounded-lg border border-[var(--border-main)] text-xs text-[var(--text-body)]"
            >
              取消
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-[var(--primary)] text-xs font-semibold text-white"
            >
              确认{workflowAction === "convert" ? "转任务" : workflowAction === "reassign" ? "转派" : "保存备忘"}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={!!reasonType}
        onClose={() => setReasonType(null)}
        title={reasonType === "hold" ? "工单搁置" : "工单驳回"}
      >
        <form onSubmit={transition} className="space-y-4">
          {reasonType === "reject" && (
            <label className="block text-xs text-[var(--text-muted)]">
              驳回原因 *
              <select
                value={rejectCategory}
                onChange={(e) => setRejectCategory(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                required
              >
                <option value="">请选择驳回原因</option>
                {availableRejectReasons.map((reasonOpt) => (
                  <option key={reasonOpt} value={reasonOpt}>
                    {reasonOpt}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-xs text-[var(--text-muted)]">
            {reasonType === "reject" ? "驳回详细说明 *" : "搁置原因说明 *"}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)]"
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
              确认{reasonType === "reject" ? "驳回" : "搁置"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
