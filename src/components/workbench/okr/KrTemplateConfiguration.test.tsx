// @vitest-environment jsdom
import React from 'react';import {render,screen,fireEvent,act,within} from '@testing-library/react';import {describe,it,expect,vi} from 'vitest';import {OkrSettingsView} from './OkrSettingsView';import type {OkrSettings} from '../../../services/okrRepository';
const settings:OkrSettings={defaultView:'list',timeRules:[],templates:[{department:'产品规划部',type:'product',fields:[],stages:['设计','开发']},{department:'产品规划部',type:'delivery',fields:[],stages:['实施','验收']},{department:'产品规划部',type:'support',fields:[],types:['内部支持']}],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},dictionaries:{productNodes:[],deliveryNodes:[],presalesNodes:[],supportTypes:[]}};
describe('grouped KR configuration',()=>{
 it('shows one department row with multiple types and retains edited values after saving and reopening',async()=>{
 const save=vi.fn(async(_settings:OkrSettings)=>true);const view=render(<OkrSettingsView settings={settings} departments={['产品规划部']} onSave={save}/>);
 expect(screen.getAllByRole('combobox',{name:/KR模板.*模板/})).toHaveLength(1);
 expect(screen.getByLabelText('KR模板1产研KR阶段')).toHaveValue('设计,开发');expect(screen.getByLabelText('KR模板1交付KR阶段')).toHaveValue('实施,验收');expect(screen.queryByLabelText('KR模板1通用KR阶段')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('KR模板1产研KR阶段'),{target:{value:'方案, 研发,'}});fireEvent.change(screen.getByLabelText('KR模板1交付KR阶段'),{target:{value:'立项, 交付'}});
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'保存配置'})));expect(save).toHaveBeenCalledOnce();const saved=save.mock.calls[0][0];
 view.unmount();render(<OkrSettingsView settings={saved} departments={['产品规划部']} onSave={save}/>);expect(screen.getByLabelText('KR模板1产研KR阶段')).toHaveValue('方案,研发');expect(screen.getByLabelText('KR模板1交付KR阶段')).toHaveValue('立项,交付');expect(screen.queryByLabelText('KR模板1通用KR阶段')).not.toBeInTheDocument();
 });
 it('multi-selects another type without adding a department configuration and preserves a toggled-off type',()=>{
 const view=render(<OkrSettingsView settings={{...settings,templates:[settings.templates[0]]}} departments={['产品规划部']} onSave={vi.fn()}/>);
 fireEvent.mouseDown(screen.getByLabelText('KR模板1模板'));fireEvent.click(screen.getByText('通用KR',{selector:'.ant-select-item-option-content'}));
 expect(screen.getAllByLabelText(/部门KR配置/)).toHaveLength(1);expect(screen.queryByLabelText('KR模板1通用KR阶段')).not.toBeInTheDocument();
 fireEvent.click(screen.getByText('通用KR',{selector:'.ant-select-item-option-content'}));fireEvent.click(screen.getByText('通用KR',{selector:'.ant-select-item-option-content'}));
 });
 it('shows the department goal template catalog and opens the local editor',()=>{
 const save=vi.fn();render(<OkrSettingsView settings={settings} departments={['产品规划部']} onSave={save}/>);fireEvent.click(screen.getByRole('button',{name:'部门目标模板'}));
 expect(screen.getByRole('tab',{name:'全部'})).toHaveAttribute('aria-selected','true');expect(screen.getByText('公司9月份各项产出成果为全年目标助关键之力')).toBeInTheDocument();expect(screen.getAllByRole('article')).toHaveLength(3);
 fireEvent.click(screen.getByRole('tab',{name:'公司层面'}));expect(screen.getAllByRole('article')).toHaveLength(2);fireEvent.click(screen.getByRole('button',{name:'新建模板'}));
 expect(screen.getByText('新建部门目标模板')).toBeInTheDocument();expect(screen.getByLabelText('O4名称')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('O1名称'),{target:{value:'本月产品目标'}});fireEvent.change(screen.getByLabelText('O1填写说明'),{target:{value:'填写本月产品目标'}});fireEvent.click(screen.getByRole('button',{name:'保存模板'}));expect(screen.getByText('模板已保存，可继续查看或编辑')).toBeInTheDocument();expect(screen.getByText('本月产品目标')).toBeInTheDocument();expect(save).not.toHaveBeenCalled();
 });

 it('supports referencing and deleting a catalog template',()=>{
 render(<OkrSettingsView settings={settings} departments={['产品规划部']} onSave={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'部门目标模板'}));const card=screen.getByText('公司9月份各项产出成果为全年目标助关键之力').closest('article');expect(card).not.toBeNull();fireEvent.click(within(card!).getByRole('button',{name:/引用 5/}));expect(within(card!).getByRole('button',{name:/引用 6/})).toBeInTheDocument();expect(within(card!).getByRole('button',{name:/删除/})).toBeEnabled();
 });
});
