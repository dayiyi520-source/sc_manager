import type { WorkItemFieldScene } from '../../services/productRepository';
import type { DesignVariant } from './designTaskPresentation';
import { fixedTaskFields } from './fixedTaskFields';

// Fixed task UI contract; legacy dictionary field settings do not govern task pages.
export const useWorkItemFieldConfig = (categoryCode: string, scene: WorkItemFieldScene, variant: DesignVariant = 'product') => fixedTaskFields(categoryCode, scene, variant);
