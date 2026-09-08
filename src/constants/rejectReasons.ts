export const REJECT_REASONS_BY_TYPE: Record<string, string[]> = {
  '客户诉求': [
    '项目部未把关/未预审',
    '客户诉求不合理/非标准需求',
    '超出合同/SOW服务范围',
    '缺少客户授权或必要附件凭证',
    '已有替代方案/现有功能已支持',
    '其他原因'
  ],
  '售前支持': [
    '售前评估信息缺失/标书约束不清',
    '技术可行性评估不通过',
    '交付周期/人员资源冲突',
    '非产品线承接范围',
    '其他原因'
  ],
  '项目交付': [
    '交付里程碑/验收标准不明确',
    '现场部署环境不具备条件',
    '前置依赖任务未完成',
    '工时/人力资源不足',
    '其他原因'
  ],
  '线上问题': [
    '问题无法复现',
    '故障日志/复现步骤缺失',
    '用户操作不当/非系统缺陷',
    '重复提交/已知缺陷',
    '其他原因'
  ],
  '其他问题': [
    '工单内容不明确',
    '不符合流程或者处理规范',
    '重复提交',
    '其他原因'
  ],
  '通用/其他': [
    '工单内容不明确',
    '不符合流程或者处理规范',
    '重复提交',
    '其他原因'
  ]
};

export function getRejectReasonsForType(type?: string): string[] {
  if (!type) return REJECT_REASONS_BY_TYPE['其他问题'];
  if (REJECT_REASONS_BY_TYPE[type]) return REJECT_REASONS_BY_TYPE[type];
  if (type.includes('售前')) return REJECT_REASONS_BY_TYPE['售前支持'];
  if (type.includes('交付')) return REJECT_REASONS_BY_TYPE['项目交付'];
  if (type.includes('客户') || type.includes('诉求')) return REJECT_REASONS_BY_TYPE['客户诉求'];
  if (type.includes('线上') || type.includes('缺陷') || type.includes('Bug')) return REJECT_REASONS_BY_TYPE['线上问题'];
  return REJECT_REASONS_BY_TYPE['其他问题'];
}
