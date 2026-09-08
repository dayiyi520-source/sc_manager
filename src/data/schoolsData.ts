export interface SchoolInfo {
  id: string
  name: string
  schoolLevel: '高职高专' | '本科院校' | '中职学校' | '应用型本科' | '职业本科'
  schoolNature: '理工类' | '综合类' | '师范类' | '医药类' | '农林类' | '艺术类' | '财经类'
  schoolType: '普通高等教育' | '职业教育' | '成人高等教育'
  ownership: '公办' | '民办' | '独立学院'
  region: '华东大区' | '华南大区' | '华中大区' | '华北大区' | '西南大区' | '西北大区' | '东北大区'
  address: string
  defaultTags: string[]
}

export const MOE_SCHOOLS_DATABASE: SchoolInfo[] = [
  {
    id: 'sch-1001',
    name: '深圳职业技术大学',
    schoolLevel: '职业本科',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华南大区',
    address: '广东省深圳市南山区留仙大道7098号',
    defaultTags: ['国双高校', '国高水平专业群', '职业本科标杆']
  },
  {
    id: 'sch-1002',
    name: '浙江机电职业技术大学',
    schoolLevel: '职业本科',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华东大区',
    address: '浙江省杭州市滨江区滨文路528号',
    defaultTags: ['国双高校', '国高水平专业群']
  },
  {
    id: 'sch-1003',
    name: '金华职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '综合类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华东大区',
    address: '浙江省金华市海棠西路888号',
    defaultTags: ['国双高校', '省双高']
  },
  {
    id: 'sch-1004',
    name: '南京工业职业技术大学',
    schoolLevel: '职业本科',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华东大区',
    address: '江苏省南京市栖霞区仙林大学城羊山北路1号',
    defaultTags: ['国双高校', '国高水平专业群']
  },
  {
    id: 'sch-1005',
    name: '无锡职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华东大区',
    address: '江苏省无锡市高浪西路1600号',
    defaultTags: ['国双高校', '省示范']
  },
  {
    id: 'sch-1006',
    name: '黄河水利职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华中大区',
    address: '河南省开封市东京大道1号',
    defaultTags: ['国双高校', '国高水平专业群']
  },
  {
    id: 'sch-1007',
    name: '广东轻工职业技术大学',
    schoolLevel: '职业本科',
    schoolNature: '综合类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华南大区',
    address: '广东省广州市海珠区新港西路152号',
    defaultTags: ['国双高校', '省双高']
  },
  {
    id: 'sch-1008',
    name: '天津职业大学',
    schoolLevel: '高职高专',
    schoolNature: '综合类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华北大区',
    address: '天津市北辰区河北大街2号',
    defaultTags: ['国双高校']
  },
  {
    id: 'sch-1009',
    name: '成都航空职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '西南大区',
    address: '四川省成都市龙泉驿区车城东七路699号',
    defaultTags: ['国双高校', '省双高']
  },
  {
    id: 'sch-1010',
    name: '陕西工业职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '西北大区',
    address: '陕西省咸阳市文汇西路12号',
    defaultTags: ['国双高校', '省示范']
  },
  {
    id: 'sch-1011',
    name: '武汉职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '综合类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华中大区',
    address: '湖北省武汉市洪山区关山大道463号',
    defaultTags: ['国双高校', '国高水平专业群']
  },
  {
    id: 'sch-1012',
    name: '长春职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '综合类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '东北大区',
    address: '吉林省长春市卫星路3278号',
    defaultTags: ['国双高校']
  },
  {
    id: 'sch-1013',
    name: '杭州电子科技大学',
    schoolLevel: '本科院校',
    schoolNature: '理工类',
    schoolType: '普通高等教育',
    ownership: '公办',
    region: '华东大区',
    address: '浙江省杭州市钱塘区白杨街道2号大街115号',
    defaultTags: ['省重点高校', '应用型试点']
  },
  {
    id: 'sch-1014',
    name: '华东师范大学',
    schoolLevel: '本科院校',
    schoolNature: '师范类',
    schoolType: '普通高等教育',
    ownership: '公办',
    region: '华东大区',
    address: '上海市闵行区东川路500号',
    defaultTags: ['国双高校', '重点本科']
  },
  {
    id: 'sch-1015',
    name: '华南理工大学',
    schoolLevel: '本科院校',
    schoolNature: '理工类',
    schoolType: '普通高等教育',
    ownership: '公办',
    region: '华南大区',
    address: '广东省广州市天河区五山路381号',
    defaultTags: ['国双高校', '重点本科']
  },
  {
    id: 'sch-1016',
    name: '重庆电子科技职业大学',
    schoolLevel: '职业本科',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '西南大区',
    address: '重庆市沙坪坝区大学城东路76号',
    defaultTags: ['国双高校', '职业本科标杆']
  },
  {
    id: 'sch-1017',
    name: '湖南铁道职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华中大区',
    address: '湖南省株洲市田心大道18号',
    defaultTags: ['国双高校', '国高水平专业群']
  },
  {
    id: 'sch-1018',
    name: '北京信息职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华北大区',
    address: '北京市朝阳区芳园西路5号',
    defaultTags: ['省双高', '省示范']
  },
  {
    id: 'sch-1019',
    name: '山东商业职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '财经类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '华东大区',
    address: '山东省济南市历城区旅游路4516号',
    defaultTags: ['国双高校', '国高水平专业群']
  },
  {
    id: 'sch-1020',
    name: '西安航空职业技术学院',
    schoolLevel: '高职高专',
    schoolNature: '理工类',
    schoolType: '职业教育',
    ownership: '公办',
    region: '西北大区',
    address: '陕西省西安市阎良区迎宾大道1号',
    defaultTags: ['省双高']
  }
]

export function searchMOESchools(keyword: string): SchoolInfo[] {
  if (!keyword || !keyword.trim()) return MOE_SCHOOLS_DATABASE.slice(0, 10)
  const kw = keyword.trim().toLowerCase()
  return MOE_SCHOOLS_DATABASE.filter(
    s =>
      s.name.toLowerCase().includes(kw) ||
      s.address.toLowerCase().includes(kw) ||
      s.region.toLowerCase().includes(kw)
  )
}
