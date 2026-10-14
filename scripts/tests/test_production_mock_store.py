import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('store',Path(__file__).parents[1]/'production_mock_server.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class StoreTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.store=module.Store(self.root)
  self.state={'revision':1,'okrRecords':[],'okrPeople':[],'okrSettings':{}}
  (self.root/'okr-state.json').write_text(json.dumps(self.state));(self.root/'research-template.json').write_text(json.dumps({'researchTypes':[]}))
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
if __name__=='__main__': unittest.main()
