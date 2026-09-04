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
  Image,
  Video,
  ArrowRight,
  X,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { StatCard, StatusTag, Drawer, Modal } from "../common/UIComponents";
import { requirementRepository } from "../../services/requirementRepository";
import { RequirementActionButtons } from "./RequirementActionButtons";
import type {
  EmployeeOption,
  RequirementEvent,
  RequirementMedia,
  RequirementTask,
  RequirementTaskType,
  RequirementWorkItem,
} from "../../types";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

const statuses: RequirementTask["status"][] = [
  "待处理",
  "处理中",
  "已搁置",
  "已驳回",
  "已完成",
];
const taskTypes: RequirementTaskType[] = [
  "产品需求",
  "bug修复",
  "售前支持",
  "项目交付",
  "运维部署",
  "技术问题",
  "其他问题",
];

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

export const RequirementPoolView: React.FC = () => {
  const {
    requirementTasks,
    addRequirementTask,
    setRequirementTasks,
    productLines,
    customers,
    currentUser,
    addToast,
  } = useApp();
  const [tab, setTab] = useState<"create" | "list">("create");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<RequirementTask | null>(null);
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
  const [title, setTitle] = useState("");
  const [productLine, setProductLine] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [requirementType, setRequirementType] = useState<
    RequirementTaskType | ""
  >("");
  const [requirementPriority, setRequirementPriority] = useState<
    RequirementTask["priority"] | ""
  >("");
  const [source, setSource] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [media, setMedia] = useState<RequirementMedia[]>([]);
  const [workOpen, setWorkOpen] = useState(false);
  const [workType, setWorkType] = useState<RequirementTaskType>("产品需求");
  const [assignee, setAssignee] = useState(currentUser.name);
  const [note, setNote] = useState("");
  const [reasonType, setReasonType] = useState<"hold" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const editor = useRef<HTMLDivElement>(null);

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
    setProductLine("");
    setOwnerName("");
    setRequirementType("");
    setRequirementPriority("");
    setSource("");
    setCustomerId("");
    setDueDate("");
    setDescription("");
    setDescriptionHtml("");
    setMedia([]);
  };
  const openCreate = () => {
    reset();
    setCreating(true);
    setTab("create");
  };
  const onMedia = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    files
      .filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/"),
      )
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () =>
          setMedia((items) => [
            ...items,
            {
              id: `${file.name}-${file.lastModified}`,
              name: file.name,
              type: file.type.startsWith("video/") ? "video" : "image",
              dataUrl: String(reader.result),
            },
          ]);
        reader.readAsDataURL(file);
      });
    event.target.value = "";
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const selectedEmployee = employees.find(
      (item) => item.name === ownerName.trim(),
    );
    const descriptionText = description || editor.current?.innerText || "";
    if (
      !title.trim() ||
      !selectedEmployee ||
      !requirementType ||
      !descriptionText.trim()
    ) {
      addToast("warning", "请补充需求名称、负责人、需求类型和需求详细描述");
      return;
    }
    const customer = customers.find((item) => item.id === customerId);
    addRequirementTask({
      title: title.trim(),
      description: descriptionText,
      descriptionHtml: descriptionHtml || editor.current?.innerHTML || "",
      media,
      productLineName: productLine || undefined,
      ownerName: selectedEmployee.name,
      department: selectedEmployee.department,
      customerId: customerId || undefined,
      customerName: customer?.name,
      priority: requirementPriority || undefined,
      taskType: requirementType,
      dueDate: dueDate || undefined,
      source: source || undefined,
    });
    setCreating(false);
    setTab("list");
    addToast("success", "工单已提交", "提交后将会自动通知到负责人");
  };
  const openDetail = async (item: RequirementTask) => {
    setSelected({ ...item, media: normalizeMedia(item.media) });
    try {
      const detail = await requirementRepository.detail(item.id);
      setEvents(Array.isArray(detail.events) ? detail.events : []);
      setWorkItems(Array.isArray(detail.workItems) ? detail.workItems : []);
    } catch {
      setEvents(Array.isArray(item.events) ? item.events : []);
      setWorkItems([]);
    }
  };
  const createWork = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !assignee.trim()) return;
    const now = new Date().toISOString();
    const localItem: RequirementWorkItem = {
      id: `work-${Date.now()}`,
      requirementId: selected.id,
      taskType: workType,
      title: selected.title,
      assigneeName: assignee,
      note,
      status: "待处理",
      createdAt: now,
    };
    let persisted = true;
    try {
      const result = await requirementRepository.createWorkItem(selected.id, {
        taskType: workType,
        assigneeName: assignee,
        note,
      });
      localItem.id = result.id;
      if (result.syncStatus === "FAILED") persisted = false;
    } catch {
      persisted = false;
    }
    if (!persisted) {
      addToast(
        "error",
        "下游任务同步失败",
        "需求已保留为处理中，请在详情中重试同步",
      );
      return;
    }
    const next = {
      ...selected,
      status: "处理中" as RequirementTask["status"],
      taskType: workType,
      assignedOwnerName: assignee,
      assignedNote: note,
      events: [
        ...(selected.events || []),
        {
          id: `event-${Date.now()}`,
          eventType: "转任务",
          fromStatus: selected.status,
          toStatus: "处理中",
          reason: note,
          operatorName: currentUser.name,
          createdAt: now,
        },
      ],
    };
    setRequirementTasks((list) =>
      list.map((item) => (item.id === selected.id ? next : item)),
    );
    setSelected(next);
    setWorkItems((list) => [localItem, ...list]);
    setEvents((list) => [...list, next.events![next.events!.length - 1]]);
    setWorkOpen(false);
    addToast(
      "success",
      "已创建下游工单",
      persisted ? `${workType}记录已生成` : "后端暂不可用，已在当前会话记录",
    );
  };
  const transition = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !reasonType || !reason.trim()) return;
    const now = new Date().toISOString();
    const nextStatus = reasonType === "hold" ? "已搁置" : "已驳回";
    let persisted = true;
    try {
      await requirementRepository.transition(
        selected.id,
        reasonType,
        reason.trim(),
      );
    } catch {
      persisted = false;
    }
    if (!persisted) {
      addToast("error", "需求操作失败", "服务未确认本次流转，请稍后重试");
      return;
    }
    const eventItem: RequirementEvent = {
      id: `event-${Date.now()}`,
      eventType: reasonType === "hold" ? "搁置" : "驳回",
      fromStatus: selected.status,
      toStatus: nextStatus,
      reason: reason.trim(),
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
    addToast(
      "success",
      `需求${nextStatus}`,
      persisted ? "流转记录已保存" : "后端暂不可用，已在当前会话记录",
    );
  };
  const filtered = useMemo(
    () =>
      requirementTasks.filter((item) => {
        const q = query.toLowerCase();
        const inScope =
          scope === "all" ||
          (scope === "mine_created"
            ? item.creatorName === currentUser.name
            : item.ownerName === currentUser.name);
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
          (status === "all" || item.status === status)
        );
      }),
    [
      requirementTasks,
      query,
      product,
      priority,
      status,
      scope,
      currentUser.name,
    ],
  );
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
    "mt-1 w-full h-10 px-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)]";
  const filterClass =
    "h-10 px-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]";
  const fields = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="md:col-span-2 text-xs text-[var(--text-muted)]">
        需求名称 *
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={fieldClass}
          placeholder="例如：支持大屏三维拓扑图实时交互漫游"
        />
      </label>
      <label className="text-xs text-[var(--text-muted)]">
        所属产品线
        <select
          value={productLine}
          onChange={(e) => setProductLine(e.target.value)}
          className={fieldClass}
        >
          <option value="">请选择产品线</option>
          {productLines.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[var(--text-muted)]">
        负责人 *
        <input
          list="requirement-employees"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          className={fieldClass}
          placeholder="输入姓名模糊搜索并选择"
        />
        <datalist id="requirement-employees">
          {employees.map((item) => (
            <option key={item.id} value={item.name}>
              {item.department || ""}
            </option>
          ))}
        </datalist>
      </label>
      <label className="text-xs text-[var(--text-muted)]">
        需求类型 *
        <select
          value={requirementType}
          onChange={(e) =>
            setRequirementType(e.target.value as RequirementTaskType)
          }
          className={fieldClass}
        >
          <option value="">请选择需求类型</option>
          {taskTypes.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[var(--text-muted)]">
        优先级
        <select
          value={requirementPriority}
          onChange={(e) =>
            setRequirementPriority(
              e.target.value as RequirementTask["priority"],
            )
          }
          className={fieldClass}
        >
          <option value="">请选择优先级</option>
          <option>P0-紧急阻断</option>
          <option>P1-高优</option>
          <option>P2-标准</option>
          <option>P3-低优</option>
        </select>
      </label>
      <label className="text-xs text-[var(--text-muted)]">
        需求来源
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={fieldClass}
        >
          <option value="">请选择需求来源</option>
          <option>客户现场提报</option>
          <option>业务/销售输入</option>
          <option>产品内部规划</option>
          <option>技术架构重构</option>
        </select>
      </label>
      <label className="text-xs text-[var(--text-muted)]">
        关联客户
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={fieldClass}
        >
          <option value="">请选择客户</option>
          {customers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[var(--text-muted)]">
        期望上线时间
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={fieldClass}
        />
      </label>
      <div className="md:col-span-2">
        <span className="text-xs text-[var(--text-muted)]">
          需求详细描述（富文本） *
        </span>
        <div
          ref={editor}
          contentEditable
          onInput={(e) => {
            setDescription((e.target as HTMLDivElement).innerText);
            setDescriptionHtml((e.target as HTMLDivElement).innerHTML);
          }}
          className="mt-1 min-h-32 p-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
        />
        <div className="mt-2 flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-body)] cursor-pointer">
            <Paperclip className="w-4 h-4" />
            添加本地图片/视频
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              onChange={onMedia}
            />
          </label>
          <span className="text-xs text-[var(--text-muted)]">
            暂不支持外部媒体链接
          </span>
        </div>
        {media.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {media.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1 border border-[var(--border-main)] rounded px-2 py-1 text-xs text-[var(--text-body)]"
              >
                {item.type === "image" ? (
                  <Image className="w-3.5 h-3.5" />
                ) : (
                  <Video className="w-3.5 h-3.5" />
                )}
                {item.name}
                <button
                  type="button"
                  onClick={() =>
                    setMedia((items) =>
                      items.filter((mediaItem) => mediaItem.id !== item.id),
                    )
                  }
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div
        className="flex items-center gap-1 border-b border-[var(--border-main)]"
        role="tablist"
      >
        <button
          role="tab"
          aria-selected={tab === "create"}
          onClick={() => setTab("create")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === "create" ? "border-[var(--primary)] text-[var(--active-text)]" : "border-transparent text-[var(--text-muted)]"}`}
        >
          提工单
        </button>
        <button
          role="tab"
          aria-selected={tab === "list"}
          onClick={() => setTab("list")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === "list" ? "border-[var(--primary)] text-[var(--active-text)]" : "border-transparent text-[var(--text-muted)]"}`}
        >
          工单列表
        </button>
      </div>
      {tab === "create" && (
        <section className="dark-panel rounded-xl p-6">
          {!creating ? (
            <div className="flex min-h-[560px] flex-col items-center justify-center text-center">
              <div className="relative flex h-72 w-full max-w-xl items-end justify-center border-b border-[var(--border-main)] pb-10">
                <div className="absolute top-4 flex flex-col items-center gap-2">
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    每一处精微调整，都在点亮更广的世界。
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Every subtle adjustment illuminates a wider world.
                  </p>
                </div>
                <div className="flex items-end gap-10">
                  <div className="relative">
                    <div className="absolute -top-10 left-10 flex h-8 w-12 items-center justify-center rounded-lg border border-[var(--ai-indigo)] text-[var(--ai-indigo)]">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--cam-cyan)] text-[var(--cam-cyan)]">
                      <User className="h-12 w-12" />
                    </div>
                  </div>
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--ai-indigo)] text-[var(--ai-indigo)]">
                    <User className="h-12 w-12" />
                    <Sparkles className="absolute -right-7 top-1 h-5 w-5 text-[var(--warning)]" />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
              >
                <Plus className="w-4 h-4" />
                提工单
              </button>
            </div>
          ) : (
            <form onSubmit={save} className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  提工单
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="待处理"
              value={pendingCount}
              unit="个"
              subText={cardSubText(todayPending)}
              icon={<Inbox className="w-5 h-5" />}
            />
            <StatCard
              title="处理中"
              value={processingCount}
              unit="个"
              subText={cardSubText(todayProcessing)}
              icon={<Clock className="w-5 h-5" />}
            />
            <StatCard
              title="已处理"
              value={handledCount}
              unit="个"
              subText={cardSubText(todayHandled)}
              icon={<CheckCircle2 className="w-5 h-5" />}
            />
            <StatCard
              title="已驳回"
              value={rejectedCount}
              unit="个"
              subText={cardSubText(todayRejected)}
              icon={<X className="w-5 h-5" />}
            />
          </div>
          <div className="dark-panel rounded-xl p-4 flex flex-nowrap items-center gap-3 overflow-x-auto">
            <select
              aria-label="工单范围"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
              className={`${filterClass} min-w-[120px] shrink-0`}
            >
              <option value="all">全部</option>
              <option value="mine_created">我提出的</option>
              <option value="mine_owned">我负责的</option>
            </select>
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索需求名称、客户、负责人"
                className="h-10 w-64 pl-9 pr-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className={`${filterClass} min-w-[150px] shrink-0`}
            >
              <option value="all">所有产品线</option>
              {productLines.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={`${filterClass} min-w-[130px] shrink-0`}
            >
              <option value="all">所有优先级</option>
              <option>P0-紧急阻断</option>
              <option>P1-高优</option>
              <option>P2-普通</option>
              <option>P2-标准</option>
              <option>P3-低优</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${filterClass} min-w-[130px] shrink-0`}
            >
              <option value="all">所有状态</option>
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={openCreate}
              className="ml-auto h-10 px-4 shrink-0 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white"
            >
              <Plus className="mr-1 inline w-4 h-4" />
              提工单
            </button>
          </div>
          <div className="dark-panel rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-main)] text-[var(--text-muted)]">
                    <th className="px-4 py-3">需求名称</th>
                    <th className="px-4 py-3">需求类型</th>
                    <th className="px-4 py-3">优先级</th>
                    <th className="px-4 py-3">所属产品线</th>
                    <th className="px-4 py-3">关联客户</th>
                    <th className="px-4 py-3">负责人</th>
                    <th className="px-4 py-3">提出人</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
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
                        {item.taskType || "待分配"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag status={item.priority} />
                      </td>
                      <td className="px-4 py-3 text-[var(--text-body)]">
                        {item.productLineName}
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
          </div>
        </>
      )}
      {selected && (
        <Drawer
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={selected.title}
          subtitle={`${selected.productLineName} · 负责人：${selected.ownerName || "未分配"}`}
          footer={
            <div className="flex w-full justify-between">
              <RequirementActionButtons
                status={selected.status}
                hasWorkItem={taskLocked}
                onWork={() => setWorkOpen(true)}
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
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[var(--text-muted)]">
                  需求状态
                </span>
                <div className="mt-1">
                  <StatusTag status={selected.status} />
                </div>
              </div>
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
                  期望上线时间
                </span>
                <p className="mt-1 text-[var(--text-primary)]">
                  {selected.dueDate || "未设置"}
                </p>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                需求详细描述
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
                    ) : (
                      <video
                        key={item.id}
                        src={item.dataUrl}
                        controls
                        className="max-h-36 rounded border border-[var(--border-main)]"
                      />
                    ),
                  )}
                </div>
              ) : null}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                流转记录
              </h3>
              {events.length ? (
                events.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-[var(--border-main)] pb-2 text-xs"
                  >
                    <span className="text-[var(--text-muted)]">
                      {item.createdAt}
                    </span>
                    <span className="mx-2 text-[var(--active-text)]">
                      {item.eventType}
                    </span>
                    <span>{item.operatorName}</span>
                    {item.reason && (
                      <p className="mt-1 text-[var(--text-muted)]">
                        原因：{item.reason}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-muted)]">暂无流转记录</p>
              )}
            </div>
            {workItems.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                  下游工作项
                </h3>
                {workItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between border-b border-[var(--border-main)] py-2 text-xs"
                  >
                    <span>
                      {item.taskType} · {item.title}
                    </span>
                    <StatusTag status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Drawer>
      )}
      <Modal
        isOpen={workOpen}
        onClose={() => setWorkOpen(false)}
        title="转任务"
      >
        <form onSubmit={createWork} className="space-y-4">
          <label className="block text-xs text-[var(--text-muted)]">
            任务类型
            <select
              value={workType}
              onChange={(e) =>
                setWorkType(e.target.value as RequirementTaskType)
              }
              className={fieldClass}
            >
              {taskTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--text-muted)]">
            下一步负责人
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className={fieldClass}
              required
            />
          </label>
          <label className="block text-xs text-[var(--text-muted)]">
            备注
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)]"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white"
            >
              确认转任务
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={!!reasonType}
        onClose={() => setReasonType(null)}
        title={reasonType === "hold" ? "需求搁置" : "需求驳回"}
      >
        <form onSubmit={transition} className="space-y-4">
          <label className="block text-xs text-[var(--text-muted)]">
            请输入原因
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)]"
              required
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white"
            >
              确认
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
