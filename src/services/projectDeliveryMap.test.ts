import { describe, expect, it } from 'vitest';
import { MOCK_PROJECT_DELIVERY_MAP } from '../data/mockSnapshot';
import type { ProductLine } from '../types';
import { MOCK_PRODUCT_LINES } from '../data/mockSnapshot';
import { projectDeliveryMap, deliveryProjectNames, deliveryProductsByProject, deliveryStagesByProduct, deliveryCurrentStage, resolveProjectProductLines } from './projectDeliveryMap';

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

 it('falls back to catalog products when delivery product names are not catalog names', () => {
  const project = MOCK_PROJECT_DELIVERY_MAP[0];
  const catalog = MOCK_PRODUCT_LINES as ProductLine[];
  expect(resolveProjectProductLines(project, catalog)).toEqual(catalog);
 });

 it('keeps only matching catalog products when the project mapping is available', () => {
  const project = { ...MOCK_PROJECT_DELIVERY_MAP[0], products: [{ ...MOCK_PROJECT_DELIVERY_MAP[0].products[0] }] };
  const catalog = [{ ...MOCK_PRODUCT_LINES[0], name: project.products[0].name }] as ProductLine[];
  expect(resolveProjectProductLines(project, catalog)).toEqual(catalog);
 });
});
