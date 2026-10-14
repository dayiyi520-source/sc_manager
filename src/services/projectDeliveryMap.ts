import { MOCK_PROJECT_DELIVERY_MAP } from '../data/mockSnapshot';
import type { DeliveryMapProject } from '../types';

// The committed snapshot is the shared, portable mock contract for the map and delivery KR.
export const projectDeliveryMap = (): DeliveryMapProject[] => MOCK_PROJECT_DELIVERY_MAP;
export const deliveryProjectNames = (projects: DeliveryMapProject[]) => projects.map(project => project.name);
export const deliveryProductsByProject = (projects: DeliveryMapProject[]) => Object.fromEntries(projects.map(project => [project.name, [...new Set(project.products.map(product => product.name))]]));
export const deliveryStagesByProduct = (projects: DeliveryMapProject[]) => Object.fromEntries(projects.flatMap(project => project.products.map(product => [`${project.name}\u0000${product.name}`, product.stages.map(stage => stage.name)])));
export const deliveryCurrentStage = (projects: DeliveryMapProject[], projectName: string, productName: string) => {
  const stages = projects.find(project => project.name === projectName)?.products.find(product => product.name === productName)?.stages || [];
  return [...stages].reverse().find(stage => stage.status === 'ongoing')?.name || [...stages].reverse().find(stage => stage.status === 'completed')?.name;
};
