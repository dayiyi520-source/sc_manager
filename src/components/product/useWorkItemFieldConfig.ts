import type { TaskFieldScene } from './fixedTaskFields';
import type { DesignVariant } from './designTaskPresentation';
import { fixedTaskFields } from './fixedTaskFields';

// Fixed task UI contract; legacy dictionary field settings do not govern task pages.
export const useWorkItemFieldConfig = (categoryCode: string, scene: TaskFieldScene, variant: DesignVariant = 'product') => fixedTaskFields(categoryCode, scene, variant);
