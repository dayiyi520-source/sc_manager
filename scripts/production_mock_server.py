"""Same-origin file store for this project's Mock deployment; stdlib only."""
import argparse, hashlib, json, os, socketserver, threading
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit

TEMPLATE_KEYS = {'researchRoles','researchStatuses','researchCategories','researchFields','researchTypes','researchNotifications','researchAutomation','researchAutomationSetting','productLines'}

def validate_state(state):
    if not isinstance(state, dict) or type(state.get('revision')) is not int or state['revision'] < 0 or not isinstance(state.get('okrRecords'), list) or not isinstance(state.get('okrPeople'), list) or not isinstance(state.get('okrSettings'), dict):
        raise ValueError('目标与复盘数据格式无效')
    ids = set()
    for row in state['okrRecords']:
        if not isinstance(row, dict) or not row.get('id') or row['id'] in ids or row.get('kind') not in {'objective','action','review'} or not row.get('ownerId') or not row.get('periodKey') or not isinstance(row.get('payload'), dict) or type(row.get('version')) is not int or row['version'] < 0:
            raise ValueError('目标与复盘记录无效或重复')
        ids.add(row['id'])

def migrate_state(current, legacy):
    merged = {row['id']: row for row in current['okrRecords']}
    for row in legacy.get('okrRecords', []):
        if row.get('kind') == 'review' and row.get('ownerId') == 'user-admin': continue
        saved = merged.get(row['id'])
        if not saved or current['revision'] == 0 or row.get('version',0) > saved.get('version',0): merged[row['id']] = row
    state = {**current, 'okrRecords':list(merged.values())}
    settings = legacy.get('okrSettings')
    if settings and (current['revision'] == 0 or settings.get('version',0) > current['okrSettings'].get('version',0)): state['okrSettings'] = settings
    if current['revision'] == 0 and legacy.get('okrPeople'): state['okrPeople'] = legacy['okrPeople']
    return state

class Store:
    def __init__(self, root): self.root=Path(root); self.lock=threading.RLock()
    def file(self, kind):
        names={'okr-state':'okr-state.json','research-template':'research-template.json'}
        if kind not in names: raise ValueError('不支持的数据类型')
        return self.root / names[kind]
    def read(self, kind): return json.loads(self.file(kind).read_text(encoding='utf-8'))
    def write(self, kind, value):
        target=self.file(kind); temporary=target.with_suffix('.tmp')
        with temporary.open('w',encoding='utf-8') as stream:
            json.dump(value,stream,ensure_ascii=False,indent=2);stream.write('\n');stream.flush();os.fsync(stream.fileno())
        os.replace(temporary,target)
    def update(self, kind, body, migrate=False):
        with self.lock:
            current=self.read(kind)
            if kind=='okr-state':
                if body.get('previousRevision') != current['revision']: raise ValueError('目标与复盘已被其他页面修改，请刷新后重试')
                state=migrate_state(current,body.get('legacy',{})) if migrate else body.get('state')
                validate_state(state);state={**state,'revision':current['revision']+1};self.write(kind,state);return state
            key=body.get('key');value=body.get('value')
            if key not in TEMPLATE_KEYS: raise ValueError('不支持的模板配置')
            valid=type(value) is bool if key=='researchAutomationSetting' else isinstance(value,dict) if key=='researchNotifications' else isinstance(value,list)
            if not valid: raise ValueError('模板配置格式错误')
            if key == 'productLines' and body.get('productPatch'):
                patch = body['productPatch']
                fields = {'name','description','website','sort','visibility','commercialAvailability'}
                if not isinstance(patch,dict) or not patch.get('id') or not isinstance(patch.get('changes'),dict) or not isinstance(patch.get('previous'),dict): raise ValueError('产品保存参数无效')
                products = current.get(key,[])
                product = next((row for row in products if row.get('id') == patch['id']), None)
                if product is None: raise ValueError('产品不存在，请刷新后重试')
                for field, next_value in patch['changes'].items():
                    if field not in fields: raise ValueError('不支持的产品字段')
                    if product.get(field) != patch['previous'].get(field) and product.get(field) != next_value: raise ValueError('产品信息已被修改，请刷新产品信息后重试；当前填写内容已保留')
                updated = {**product, **patch['changes']}
                if not isinstance(updated.get('name'),str) or not updated['name'].strip(): raise ValueError('产品名称不能为空')
                if updated['name'] != product.get('name'): updated['nameAliases'] = list(dict.fromkeys([*product.get('nameAliases',[]),product['name']]))
                value = [updated if row.get('id') == patch['id'] else row for row in products]
                self.write(kind,{**current,key:value});return {'saved':True,'value':value}
            if current.get(key) != body.get('previous'): raise ValueError('模板已被其他页面修改，请刷新后重试')
            self.write(kind,{**current,key:value});return {'saved':True}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def send_json(self, status, data):
        raw=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
    def handle_request(self, method):
        path=urlsplit(self.path).path
        if not path.startswith(self.server.prefix): self.send_json(404,{'message':'不存在的 Mock 路径'});return
        kind=path[len(self.server.prefix):]
        try:
            if kind=='health' and method=='GET':
                self.send_json(200,{'ok':True,'release':self.server.release,'schema':'file-mock-v1'});return
            if method=='GET':
                with self.server.store.lock: value=self.server.store.read(kind)
                self.send_json(200,value);return
            origin=self.headers.get('Origin','')
            if not origin or urlsplit(origin).hostname != self.headers.get('Host','').split(':')[0]:
                self.send_json(403,{'message':'仅允许本站页面保存 Mock 数据'});return
            if not self.headers.get('Content-Type','').startswith('application/json'): raise ValueError('请求格式错误')
            length=int(self.headers.get('Content-Length','0'))
            if length<=0 or length>20*1024*1024: raise ValueError('数据为空或过大')
            body=json.loads(self.rfile.read(length))
            if not isinstance(body,dict): raise ValueError('请求格式错误')
            if method=='POST' and kind!='okr-state': raise ValueError('不支持的请求')
            self.send_json(200,self.server.store.update(kind,body,method=='POST'))
        except (KeyError,TypeError,ValueError) as error: self.send_json(409,{'message':str(error)})
        except Exception: self.send_json(500,{'message':'Mock 数据保存失败，请重试'})
    def do_GET(self): self.handle_request('GET')
    def do_PUT(self): self.handle_request('PUT')
    def do_POST(self): self.handle_request('POST')

class Server(socketserver.ThreadingMixIn, getattr(socketserver, 'UnixStreamServer', socketserver.TCPServer)): daemon_threads=True

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--socket',required=True);parser.add_argument('--data-dir',required=True);parser.add_argument('--prefix',required=True);parser.add_argument('--release',required=True);args=parser.parse_args()
    if not hasattr(socketserver,'UnixStreamServer'): parser.error('Production Mock service requires Linux Unix sockets')
    socket=Path(args.socket)
    if socket.exists(): socket.unlink()
    with Server(str(socket),Handler) as server:
        os.chmod(socket,0o660);server.store=Store(args.data_dir);server.prefix=args.prefix;server.release=args.release;server.serve_forever()

if __name__=='__main__': main()
