"""Deploy the existing static Mock site with backups and an atomic directory switch."""
import argparse, hashlib, json, os, re, shlex, shutil, subprocess, tarfile, tempfile, urllib.request
from datetime import datetime, timezone
from pathlib import Path
import paramiko


def env_values(path):
    result = dict(os.environ)
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            if '=' in line and not line.startswith('#'):
                key, value = line.split('=', 1)
                parsed = shlex.split(value)
                result[key] = parsed[0] if parsed else ''
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', default='.')
    parser.add_argument('--source-dir', required=True, help='Verified isolated source snapshot; never implicitly deploy a dirty workspace.')
    parser.add_argument('--revision', required=True, help='Source revision with explicitly reviewed deployment patches.')
    parser.add_argument('--build-only', action='store_true')
    args = parser.parse_args()
    project = Path(args.project).resolve()
    source = Path(args.source_dir).resolve()
    route = json.loads((project / '.enterprise-app-factory/deployment/nginx-route.json').read_text(encoding='utf-8'))
    base = route['frontendPath']
    if base != '/sc-manager-frontend/':
        raise SystemExit('Unexpected route; use prepare_deployment before publishing.')
    values = env_values(project / '.enterprise-app-factory/secrets/runtime.env')
    node = shutil.which('node')
    if not node or not (source / 'node_modules/vite/bin/vite.js').exists():
        raise SystemExit('Node/Vite dependencies are missing.')
    build_env = {**os.environ, 'VITE_BASE_PATH': base, 'VITE_MOCK_MODE': 'true', 'VITE_API_BASE_URL': '', 'VITE_MOCK_DATA_VERSION': args.revision}
    subprocess.run([node, str(source / 'node_modules/vite/bin/vite.js'), 'build'], cwd=source, env=build_env, check=True)
    dist = source / 'dist'
    index = (dist / 'index.html').read_text(encoding='utf-8')
    if '/assets/' in index.replace(base + 'assets/', '') or base + 'assets/' not in index:
        raise SystemExit('Incorrect frontend base path.')
    js = '\n'.join(path.read_text(encoding='utf-8') for path in (dist / 'assets').glob('*.js'))
    if 'demo-preview-' not in js:
        raise SystemExit('Product Mock data missing from artifact.')
    # Presales and delivery seeds are resolved from the new customer/opportunity/project
    # directory services at runtime; their old demo IDs are intentionally not bundled.
    (dist / 'mock-data').mkdir(exist_ok=True)
    (dist / 'mock-service').mkdir(exist_ok=True)
    snapshots = {'okr-state.json':'mockOkrState.json', 'research-template.json':'mockResearchTemplate.json'}
    hashes = {}
    for target, filename in snapshots.items():
        data = (source / 'src/data' / filename).read_bytes()
        json.loads(data)
        (dist / 'mock-data' / target).write_bytes(data)
        hashes[target] = hashlib.sha256(data).hexdigest()
    shutil.copy2(source / 'scripts/production_mock_server.py', dist / 'mock-service/server.py')
    shutil.copy2(source / 'scripts/setup_production_mock.py', dist / 'mock-service/setup.py')
    if base + 'api/mock/' not in js: raise SystemExit('Production Mock endpoint namespace missing from artifact')
    release = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    manifest = {'release': release, 'revision': args.revision, 'mode': 'persistent-mock', 'mockSnapshotHashes': hashes, 'frontendPath': base, 'businessSamples': {'presales': 8, 'delivery': 8}, 'productPreviewSamplesPerCategory': 3}
    (dist / 'release.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    if args.build_only:
        print(json.dumps({'status': 'built', **manifest}, ensure_ascii=False)); return
    required = ['DEPLOY_SERVER_HOST', 'DEPLOY_SERVER_SSH_USER', 'DEPLOY_SERVER_SSH_PORT', 'DEPLOY_SERVER_SSH_PASSWORD']
    if any(not values.get(key) for key in required):
        raise SystemExit('Missing deployment runtime credentials.')
    client = paramiko.SSHClient(); client.load_system_host_keys(); client.set_missing_host_key_policy(paramiko.WarningPolicy())
    client.connect(values['DEPLOY_SERVER_HOST'], port=int(values['DEPLOY_SERVER_SSH_PORT']), username=values['DEPLOY_SERVER_SSH_USER'], password=values['DEPLOY_SERVER_SSH_PASSWORD'], timeout=20)
    def execute(command, timeout=60):
        _, out, err = client.exec_command(command, timeout=timeout)
        output, error = out.read().decode(), err.read().decode()
        status = out.channel.recv_exit_status()
        if status: raise RuntimeError('Remote deployment check failed: ' + error[:800])
        return output
    remote_root = '/opt/sc-manager-frontend'
    remote_release = remote_root + '/releases/' + release
    archive_path = remote_root + '/incoming/' + release + '.tar.gz'
    try:
        execute("test -f /www/server/panel/vhost/nginx/routes/sc-manager-frontend.conf && grep -Fq 'alias /opt/sc-manager-frontend/dist/' /www/server/panel/vhost/nginx/routes/sc-manager-frontend.conf && nginx -t")
        execute('mkdir -p ' + shlex.quote(remote_root + '/incoming') + ' ' + shlex.quote(remote_root + '/releases') + ' ' + shlex.quote(remote_root + '/backups'))
        with tempfile.TemporaryDirectory(prefix='sc-manager-artifact-') as tmp:
            archive = Path(tmp) / 'frontend.tar.gz'
            with tarfile.open(archive, 'w:gz') as tar:
                for path in dist.iterdir(): tar.add(path, arcname=path.name)
            with client.open_sftp() as sftp: sftp.put(str(archive), archive_path)
        remote_code = '''import json, os, pathlib, shutil, tarfile, sys, subprocess
root=pathlib.Path(sys.argv[1]); release=sys.argv[2]
new=root/'releases'/release; backup=root/'backups'/release; current=root/'dist'
new.mkdir(); backup.mkdir()
with tarfile.open(root/'incoming'/(release+'.tar.gz')) as archive: archive.extractall(new, filter='data')
if not (new/'index.html').is_file(): raise RuntimeError('Missing release index')
# Preserve previously referenced hashed assets for open tabs; new index references new artifacts.
old_assets=current/'assets'
if old_assets.exists(): shutil.copytree(old_assets,new/'assets',dirs_exist_ok=True)
(backup/'previous-target.txt').write_text(str(current.resolve()))
subprocess.run(['python3',str(new/'mock-service/setup.py'),'--root',str(root),'--release-dir',str(new),'--backup',str(backup),'--prefix','/sc-manager-frontend/api/mock/','--release',release],check=True)
if current.is_symlink():
 os.symlink(str(new), root/('next-'+release)); os.replace(root/('next-'+release),current)
else:
 os.replace(current,backup/'dist'); os.symlink(str(new),current)
print(json.dumps({'release':release,'backup':str(backup),'target':str(new)}))
'''
        command = 'python3 - ' + shlex.quote(remote_root) + ' ' + shlex.quote(release) + " <<'PY'\n" + remote_code + '\nPY'
        result = execute(command)
        try:
            public = 'https://cp.stringedu.com' + base
            with urllib.request.urlopen(public + 'api/mock/health',timeout=25) as response:
                health = json.load(response)
            if not health.get('ok') or health.get('release') != release: raise RuntimeError('Public Mock service release mismatch')
            for name in ['okr-state','research-template']:
                with urllib.request.urlopen(public + 'api/mock/' + name,timeout=25) as response:
                    json.load(response)
            with urllib.request.urlopen(public + 'index.html?release=' + release, timeout=25) as response: live = response.read()
            if live != (dist / 'index.html').read_bytes(): raise RuntimeError('Public index does not match new artifact')
            asset = re.search(r'src="([^"]+assets/[^"]+.js)"', live.decode()).group(1)
            with urllib.request.urlopen('https://cp.stringedu.com' + asset, timeout=25) as response:
                if response.status != 200: raise RuntimeError('Entry asset unavailable')
            with urllib.request.urlopen(public + 'app/wb_work_order?release=' + release, timeout=25) as response:
                if response.status != 200: raise RuntimeError('Direct page route unavailable')
        except Exception:
            rollback = "import os,pathlib,sys; r=pathlib.Path(sys.argv[1]); b=r/'backups'/sys.argv[2]; old=b/'dist'; target=str(old) if old.exists() else (b/'previous-target.txt').read_text(); t=r/'rollback-next'; os.symlink(target,t); os.replace(t,r/'dist')"
            execute('python3 -c ' + shlex.quote(rollback) + ' ' + shlex.quote(remote_root) + ' ' + shlex.quote(release))
            execute('python3 ' + shlex.quote(remote_release+'/mock-service/setup.py')+' --root '+shlex.quote(remote_root)+' --release-dir '+shlex.quote(remote_release)+' --backup '+shlex.quote(remote_root+'/backups/'+release)+' --prefix /sc-manager-frontend/api/mock/ --release '+shlex.quote(release)+' --rollback')
            raise
        print(json.dumps({'status': 'deployed', **manifest, 'publicUrl': public, 'remote': json.loads(result)}, ensure_ascii=False))
    finally: client.close()


if __name__ == '__main__': main()
