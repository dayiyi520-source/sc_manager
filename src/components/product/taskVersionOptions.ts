import type { ProductLine, VersionIteration } from '../../types';

export const taskVersionOptions = (versions: VersionIteration[], product?: Pick<ProductLine, 'id' | 'name'>) =>
  product ? versions.filter(version => version.productLineId
    ? version.productLineId === product.id
    : version.productLineName === product.name) : [];
