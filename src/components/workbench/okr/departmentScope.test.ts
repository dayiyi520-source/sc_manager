import {describe,it,expect} from 'vitest';
import {otherDepartmentPeople} from './departmentScope';
import {buildOkrScopeGroups} from './OkrScopeSidebar';
import type {OkrPerson} from '../../../services/okrRepository';
const people:OkrPerson[]=[{id:'me',name:'本人',department:'产品规划部',rootFlag:0,supervisorId:'boss',version:1},{id:'own',name:'同部门',department:' 产品规划部 ',rootFlag:0,supervisorId:'me',version:1},{id:'other',name:'其他',department:'软件研发部',rootFlag:0,supervisorId:'boss',version:1}];
describe('other department scope',()=>{
 it('uses current organization rather than stale session department and trims membership',()=>{expect(otherDepartmentPeople(people,'me','旧部门').map(p=>p.id)).toEqual(['other']);expect(buildOkrScopeGroups(people,'me').find(g=>g.key==='otherDepartments')?.departmentGroups?.map(g=>g.department)).toEqual(['软件研发部']);});
 it('does not invent department membership before current organization has loaded',()=>{expect(otherDepartmentPeople([], 'me')).toEqual([]);});
});
