import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('store',Path(__file__).parents[1]/'production_mock_server.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class StoreTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.store=module.Store(self.root)
  self.state={'revision':1,'okrRecords':[],'okrPeople':[],'okrSettings':{}}
  (self.root/'okr-state.json').write_text(json.dumps(self.state));(self.root/'research-template.json').write_text(json.dumps({'researchTypes':[]}))
 def test_removed_field_configuration_is_rejected(self):
  before=self.store.read('research-template')
  with self.assertRaises(ValueError): self.store.update('research-template',{'key':'researchFields','value':[]})
  self.assertEqual(self.store.read('research-template'),before)
 def tearDown(self): self.tmp.cleanup()
 def test_goal_roundtrip_and_conflict(self):
  record={'id':'goal','kind':'objective','ownerId':'manager','periodKey':'2026-10','version':0,'payload':{'title':'goal'}}
  saved=self.store.update('okr-state',{'previousRevision':1,'state':{**self.state,'okrRecords':[record]}})
  self.assertEqual(saved['revision'],2);self.assertEqual(module.Store(self.root).read('okr-state')['okrRecords'],[record])
  with self.assertRaises(ValueError): self.store.update('okr-state',{'previousRevision':1,'state':self.state})
  self.assertEqual(self.store.read('okr-state')['revision'],2)
 def test_cleanup_keeps_new_boss_reviews(self):
  old={'id':'old','kind':'review','ownerId':'user-admin','periodKey':'2026-10','version':0,'payload':{}}
  new={**old,'id':'new'};self.state['okrRecords']=[new];self.store.write('okr-state',self.state)
  result=self.store.update('okr-state',{'previousRevision':1,'legacy':{'okrRecords':[old]}},True)
  self.assertEqual([r['id'] for r in result['okrRecords']],['new'])
 def test_template_atomic_save_and_conflict(self):
  self.store.update('research-template',{'key':'researchTypes','previous':[],'value':[{'id':'template'}]})
  with self.assertRaises(ValueError): self.store.update('research-template',{'key':'researchTypes','previous':[],'value':[]})
  self.assertEqual(self.store.read('research-template')['researchTypes'],[{'id':'template'}])
 def test_arbitrary_file_and_invalid_rows_rejected(self):
  with self.assertRaises(ValueError): self.store.file('../../secret')
  with self.assertRaises(ValueError): self.store.update('okr-state',{'previousRevision':1,'state':{**self.state,'okrRecords':[{}]}})
  self.assertEqual(self.store.read('okr-state'),self.state)
 def test_product_patch_preserves_unrelated_updates_and_rejects_race(self):
  self.store.write('research-template',{'productLines':[{'id':'p','name':'old','description':'latest'},{'id':'other','name':'another latest'}]})
  patch={'id':'p','previous':{'name':'old'},'changes':{'name':'new'}}
  result=self.store.update('research-template',{'key':'productLines','value':[],'productPatch':patch})
  self.assertEqual(result['value'][0]['name'],'new');self.assertEqual(result['value'][0]['description'],'latest');self.assertEqual(result['value'][1]['name'],'another latest')
  self.assertEqual(result['value'][0]['nameAliases'],['old'])
  with self.assertRaisesRegex(ValueError,'产品信息已被修改'): self.store.update('research-template',{'key':'productLines','value':[],'productPatch':{'id':'p','previous':{'name':'old'},'changes':{'name':'overwrite'}}})
  self.assertEqual(self.store.read('research-template')['productLines'][0]['name'],'new')
  self.assertEqual(self.store.update('research-template',{'key':'productLines','value':[],'productPatch':patch})['value'],result['value'])
 def test_product_patch_rejects_missing_and_identity_updates(self):
  self.store.write('research-template',{'productLines':[{'id':'p','name':'old'}]})
  for patch in [{'id':'missing','previous':{},'changes':{'name':'new'}},{'id':'p','previous':{},'changes':{'id':'other'}}]:
   with self.assertRaises(ValueError): self.store.update('research-template',{'key':'productLines','value':[],'productPatch':patch})
  self.assertEqual(self.store.read('research-template')['productLines'][0]['name'],'old')
 def test_review_fields_survive_restart_and_receipts_merge_without_content_overwrite(self):
  payload={'title':'部门月报','reviewType':'month','startDate':'2026-10-01','endDate':'2026-10-31','departmentReviewExclusions':[{'employeeId':'e','employeeName':'员工','reason':'本轮休假'}],'departmentFeedbackRows':[{'employeeId':'e','employeeName':'员工','reviewId':'r','suggestion':'改善协作','judgment':'需公司解决'}]}
  record={'id':'monthly','kind':'review','ownerId':'manager','periodKey':'2026-10','status':'submitted','version':1,'viewedBy':['admin'],'payload':payload}
  saved=self.store.update('okr-state',{'previousRevision':1,'state':{**self.state,'okrRecords':[record]}})
  restarted=module.Store(self.root)
  self.assertEqual(restarted.read('okr-state')['okrRecords'],[record])
  legacy={**record,'viewedBy':['manager'],'payload':{**payload,'departmentFeedbackRows':[],'departmentReviewExclusions':[]}}
  result=restarted.update('okr-state',{'previousRevision':saved['revision'],'legacy':{'okrRecords':[legacy]}},True)
  self.assertEqual(result['okrRecords'],[{**record,'viewedBy':['admin','manager']}])
  again=restarted.update('okr-state',{'previousRevision':result['revision'],'legacy':{'okrRecords':[legacy]}},True)
  self.assertEqual(again['okrRecords'],result['okrRecords'])
  for changed in [{'periodKey':'other'},{'status':'draft'}]:
   isolated=module.migrate_state({**self.state,'okrRecords':[record]}, {'okrRecords':[{**legacy,**changed}]})
   self.assertEqual(isolated['okrRecords'],[record])
if __name__=='__main__': unittest.main()
