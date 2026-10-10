import { useEffect, useMemo, useState } from 'react';
import { productRepository, WorkItemFieldConfiguration, WorkItemFieldScene } from '../../services/productRepository';

export const REQUIRED_WORK_ITEM_FIELDS = ['title', 'status', 'assignee'] as const;
const DETAIL_SYSTEM_FIELDS = ['creator', 'createdAt', 'updater', 'updatedAt'] as const;

const isRequiredField = (fieldCode: string) => REQUIRED_WORK_ITEM_FIELDS.includes(fieldCode as typeof REQUIRED_WORK_ITEM_FIELDS[number]);
const isRequiredCreationDate = (fieldCode: string, scene: WorkItemFieldScene) => (scene === 'CREATE' || scene === 'CREATE_CHILD') && (fieldCode === 'plannedStartDate' || fieldCode === 'plannedEndDate');

export const useWorkItemFieldConfig = (categoryCode: string, scene: WorkItemFieldScene) => {
  const [fields, setFields] = useState<WorkItemFieldConfiguration[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    const loadConfigurations = productRepository.workItemFieldConfigurations;
    if (typeof loadConfigurations !== 'function') {
      setFields([]);
      setLoaded(true);
      return () => { active = false; };
    }
    loadConfigurations(categoryCode)
      .then((result) => {
        if (!active) return;
        setFields(result.scenes.find((item) => item.scene === scene)?.fields || []);
        setLoaded(true);
      })
      .catch(() => { if (active) { setFields([]); setLoaded(true); } });
    return () => { active = false; };
  }, [categoryCode, scene]);

  const fieldMap = useMemo(() => new Map(fields.map((field) => [field.fieldCode, field])), [fields]);
  const visible = (fieldCode: string) => isRequiredField(fieldCode) || isRequiredCreationDate(fieldCode, scene) || (scene === 'DETAIL' && DETAIL_SYSTEM_FIELDS.includes(fieldCode as typeof DETAIL_SYSTEM_FIELDS[number])) || fieldMap.get(fieldCode)?.visible !== false;
  const required = (fieldCode: string) => isRequiredField(fieldCode) || isRequiredCreationDate(fieldCode, scene) || Boolean(fieldMap.get(fieldCode)?.required);
  const editable = (fieldCode: string) => !DETAIL_SYSTEM_FIELDS.includes(fieldCode as typeof DETAIL_SYSTEM_FIELDS[number]) && !fieldMap.get(fieldCode)?.locked && fieldMap.get(fieldCode)?.editable !== false;
  const order = (fieldCode: string) => fieldMap.get(fieldCode)?.sort ?? 999;

  return { fields, loaded, visible, required, editable, order };
};
