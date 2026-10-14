import { describe, expect, it } from 'vitest';
import { MOCK_PROJECT_DELIVERY_MAP } from '../data/mockSnapshot';
import { projectDeliveryMap, deliveryProjectNames, deliveryProductsByProject, deliveryStagesByProduct, deliveryCurrentStage } from './projectDeliveryMap';

describe('portable project delivery map contract', () => {
 it('shares committed projects, products and product milestones with the KR picker', () => {
  const projects=projectDeliveryMap();
  expect(projects).toBe(MOCK_PROJECT_DELIVERY_MAP);
  expect(projects.length).toBeGreaterThan(0);
  const project=projects[0], product=project.products[0];
  expect(deliveryProjectNames(projects)).toContain(project.name);
  expect(deliveryProductsByProject(projects)[project.name]).toContain(product.name);
  expect(deliveryStagesByProduct(projects)[`${project.name}\u0000${product.name}`]).toEqual(product.stages.map(stage=>stage.name));
  expect(deliveryCurrentStage(projects,project.name,product.name)).toBe(product.stages.find(stage=>stage.status==='ongoing')?.name || [...product.stages].reverse().find(stage=>stage.status==='completed')?.name);
 });
});
