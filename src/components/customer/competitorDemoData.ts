import type { ProductLine } from '../../types';
import { isSaleableProduct } from '../../services/presalesCenterRepository';
import type { CompetitorRecord } from './CompetitorManagementView';

type DemoProduct = { productIndex: number; name: string; material?: string };
type DemoEncounter = { name: string; productIndex: number; result: string };

const companies: Array<{
  name: string;
  capital: string;
  representative: string;
  createdAt: string;
  products: DemoProduct[];
  encounters: DemoEncounter[];
}> = [
  {
    name: '演示·星辰教育科技有限公司', capital: '1,200万元', representative: '演示人员甲', createdAt: '2026-11-11 09:30',
    products: [
      { productIndex: 0, name: '演示·项目协同平台', material: '演示·竞品功能介绍.pdf' },
      { productIndex: 1, name: '演示·智慧门户系统', material: '演示·产品手册.pdf' },
    ],
    encounters: [
      { name: '演示·智慧校园建设项目', productIndex: 0, result: '中标' },
      { name: '演示·数字化平台采购项目', productIndex: 1, result: '未中标' },
    ],
  },
  {
    name: '演示·云图信息技术有限公司', capital: '3,000万元', representative: '演示人员乙', createdAt: '2026-11-10 16:45',
    products: [{ productIndex: 0, name: '演示·教育数据平台', material: '演示·方案摘要.pdf' }],
    encounters: [{ name: '演示·区域教育数据治理项目', productIndex: 0, result: '投标中' }],
  },
  {
    name: '演示·启航数字科技有限公司', capital: '800万元', representative: '演示人员丙', createdAt: '2026-11-09 11:20',
    products: [{ productIndex: 1, name: '演示·校园服务门户' }], encounters: [],
  },
  {
    name: '演示·远峰软件有限公司', capital: '2,000万元', representative: '演示人员丁', createdAt: '2026-11-08 14:10',
    products: [], encounters: [{ name: '演示·院校信息化升级项目', productIndex: 0, result: '待开标' }],
  },
];

export function createCompetitorDemoRecords(productLines: ProductLine[]): CompetitorRecord[] {
  const saleable = productLines.filter(isSaleableProduct);
  return companies.map((company, companyIndex) => ({
    id: `demo-competitor-${companyIndex + 1}`,
    companyName: company.name,
    registeredCapital: company.capital,
    legalRepresentative: company.representative,
    creatorName: '演示管理员',
    createdAt: company.createdAt,
    products: company.products.flatMap((item, index) => {
      const product = saleable[item.productIndex];
      return product ? [{
        id: `demo-product-${companyIndex + 1}-${index + 1}`,
        productId: product.id,
        competitorProduct: item.name,
        attachments: item.material ? [{ id: `demo-material-${companyIndex + 1}-${index + 1}`, name: item.material }] : [],
      }] : [];
    }),
    encounters: company.encounters.map((item, index) => ({
      id: `demo-encounter-${companyIndex + 1}-${index + 1}`,
      biddingName: item.name,
      coreProduct: saleable[item.productIndex]?.name || '—',
      result: item.result,
    })),
  }));
}
