"""Prepare/restore only the sc-manager Mock service and its owned Nginx route."""
import argparse, json, os, shutil, subprocess
from pathlib import Path

UNIT=Path('/etc/systemd/system/sc-manager-frontend-mock.service')
ROUTE=Path('/www/server/panel/vhost/nginx/routes/sc-manager-frontend.conf')
FILES=('okr-state.json','research-template.json')

def run(*args,check=True): return subprocess.run(args,check=check,capture_output=True,text=True)
def atomic(path,text):
    temporary=path.with_suffix(path.suffix+'.next');temporary.write_text(text,encoding='utf-8');os.replace(temporary,path)
def rollback(root,backup):
    metadata=json.loads((backup/'mock-rollback.json').read_text())
    run('systemctl','stop',UNIT.name,check=False)
    if metadata['unit']: atomic(UNIT,(backup/'mock-unit.previous').read_text())
    elif UNIT.exists(): UNIT.unlink()
    atomic(ROUTE,(backup/'nginx-route.previous').read_text())
    shared=root/'shared'/'mock'
    for name in FILES:
        previous=backup/('mock-'+name)
        if previous.exists(): shutil.copy2(previous,shared/name)
    run('systemctl','daemon-reload')
    if metadata['active']:run('systemctl','start',UNIT.name)
    if not metadata['enabled']:run('systemctl','disable',UNIT.name,check=False)
    run('nginx','-t');run('systemctl','reload','nginx')

def prepare(root,new,backup,prefix,release):
    if root.resolve()!=Path('/opt/sc-manager-frontend') or not str(new.resolve()).startswith(str(root/'releases')+'/') or prefix!='/sc-manager-frontend/api/mock/':raise RuntimeError('Unexpected project route or release root')
    original=ROUTE.read_text()
    if 'alias /opt/sc-manager-frontend/dist/' not in original:raise RuntimeError('Unexpected Nginx route owner')
    if UNIT.exists() and str(root) not in UNIT.read_text():raise RuntimeError('Mock service name belongs to another project')
    effective=run('nginx','-T').stdout
    if prefix in effective and prefix not in original:raise RuntimeError('Mock Nginx path belongs to another configuration')
    shared=root/'shared'/'mock';shared.mkdir(parents=True,exist_ok=True)
    (backup/'nginx-route.previous').write_text(original)
    metadata={'unit':UNIT.exists(),'active':run('systemctl','is-active',UNIT.name,check=False).returncode==0,'enabled':run('systemctl','is-enabled',UNIT.name,check=False).returncode==0}
    (backup/'mock-rollback.json').write_text(json.dumps(metadata))
    if UNIT.exists():shutil.copy2(UNIT,backup/'mock-unit.previous')
    if metadata['active']:run('systemctl','stop',UNIT.name)
    for name in FILES:
        if (shared/name).exists():shutil.copy2(shared/name,backup/('mock-'+name))
    try:
        import pwd,grp
        try:pwd.getpwnam('sc-manager-mock')
        except KeyError:run('useradd','--system','--no-create-home','--home-dir',str(shared),'--shell','/usr/sbin/nologin','--gid','www-data','sc-manager-mock')
        uid=pwd.getpwnam('sc-manager-mock').pw_uid;gid=grp.getgrnam('www-data').gr_gid
        for name in FILES:
            incoming=json.loads((new/'mock-data'/name).read_text())
            if name=='okr-state.json' and (shared/name).exists():
                old=json.loads((shared/name).read_text());rows={row['id']:row for row in incoming['okrRecords']}
                for row in old['okrRecords']:
                    source=rows.get(row['id'])
                    if not source or row.get('version',0)>source.get('version',0):rows[row['id']]=row
                incoming['okrRecords']=list(rows.values());incoming['revision']=max(old.get('revision',0),incoming.get('revision',0))+1
                if old.get('okrSettings',{}).get('version',0)>incoming['okrSettings'].get('version',0):incoming['okrSettings']=old['okrSettings']
            atomic(shared/name,json.dumps(incoming,ensure_ascii=False,indent=2)+'\n');os.chown(shared/name,uid,gid);os.chmod(shared/name,0o660)
        os.chown(shared,uid,gid);os.chmod(shared,0o750)
        unit=f"""[Unit]
Description=sc-manager-frontend file Mock persistence
After=network.target
[Service]
Type=simple
User=sc-manager-mock
Group=www-data
ExecStart=/usr/bin/python3 {new}/mock-service/server.py --socket /run/sc-manager-frontend-mock/mock.sock --data-dir {shared} --prefix {prefix} --release {release}
Restart=on-failure
RuntimeDirectory=sc-manager-frontend-mock
RuntimeDirectoryMode=0750
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths={shared} /run/sc-manager-frontend-mock
[Install]
WantedBy=multi-user.target
"""
        atomic(UNIT,unit);run('systemctl','daemon-reload');run('systemctl','enable',UNIT.name);run('systemctl','restart',UNIT.name)
        import time,socket
        for attempt in range(30):
            if Path('/run/sc-manager-frontend-mock/mock.sock').exists():break
            time.sleep(.1)
        with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as client:
            client.settimeout(5);client.connect('/run/sc-manager-frontend-mock/mock.sock');client.sendall(f'GET {prefix}health HTTP/1.0\r\nHost: cp.stringedu.com\r\n\r\n'.encode());response=client.recv(8192)
            if b'200 OK' not in response:raise RuntimeError('Mock service health failed')
        block=f"""# MOCK_PERSISTENCE_START
location ^~ {prefix} {{
    client_max_body_size 20m;
    proxy_pass http://unix:/run/sc-manager-frontend-mock/mock.sock;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
    add_header Cache-Control "no-store" always;
}}
# MOCK_PERSISTENCE_END
"""
        import re
        clean=re.sub(r'# MOCK_PERSISTENCE_START.*?# MOCK_PERSISTENCE_END\n?', '',original,flags=re.S)
        atomic(ROUTE,block+clean);run('nginx','-t');run('systemctl','reload','nginx')
    except Exception:
        rollback(root,backup);raise

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--root',required=True);parser.add_argument('--release-dir',required=True);parser.add_argument('--backup',required=True);parser.add_argument('--prefix',required=True);parser.add_argument('--release',required=True);parser.add_argument('--rollback',action='store_true');args=parser.parse_args()
    root=Path(args.root);backup=Path(args.backup)
    if root.resolve()!=Path('/opt/sc-manager-frontend') or not str(backup.resolve()).startswith(str(root/'backups')+'/'):raise RuntimeError('Unexpected rollback target')
    if args.rollback:rollback(root,backup)
    else:prepare(root,Path(args.release_dir),backup,args.prefix,args.release)
if __name__=='__main__':main()
