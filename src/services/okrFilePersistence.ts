import { createMockReadWindow } from './mockReadWindow';
import { mockStateEndpoint } from './mockStateEndpoint';
import type { OkrFileState } from '../../scripts/mock-okr-state-plugin';
const keys = ['okrRecords','okrPeople','okrSettings'] as const;
const storageKey = (key: string) => `shichuang.frontend.mock.${key}`;
const migrationKey='shichuang.frontend.mock.okrFileMigration.v1';
export function createOkrFilePersistence(storage: Storage, request: typeof fetch = fetch) {
  const readWindow = createMockReadWindow();
  let cachedState: OkrFileState | undefined;
  let readFailure: { error: unknown } | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const transfer = async (init?: RequestInit): Promise<OkrFileState> => {
    let response: Response;
    try { response=await request(mockStateEndpoint('okr-state'),{...init, signal: AbortSignal.timeout(8000)}); }
    catch { throw new Error('无法连接复盘数据服务，请确认页面服务正常运行后重试'); }
    let result: OkrFileState & { message?: string };
    try { result=await response.json(); }
    catch { throw new Error('复盘数据服务返回内容无效，请刷新页面后重试'); }
    if(!response.ok) throw new Error(result.message || '目标与复盘 Mock 保存失败');
    return result;
  };
  const send = (method: string, data: unknown) => transfer({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const hydrate = (state: OkrFileState) => keys.forEach(key => {
    const serialized = JSON.stringify(state[key]);
    if (storage.getItem(storageKey(key)) !== serialized) storage.setItem(storageKey(key), serialized);
  });
  return {
    run<T>(operation: () => Promise<T>, readOnly = false): Promise<T> {
      const previousFailure = readFailure;
      const task=queue.then(async()=>{
        if (readOnly && previousFailure !== readFailure) throw readFailure!.error;
        let state = cachedState;
        if (!readOnly || !state || !readWindow.isFresh()) {
          try { state = await transfer(); }
          catch (error) { readFailure = { error }; throw error; }
          if(!storage.getItem(migrationKey)) {
            const legacy: Partial<OkrFileState>={};
            for(const key of keys) {const raw=storage.getItem(storageKey(key));if(raw) legacy[key]=JSON.parse(raw);}
            if(Object.keys(legacy).length) state=await send('POST',{legacy,previousRevision:state.revision});
            storage.setItem(migrationKey,'done');
          }
          hydrate(state);
          cachedState = state;
          readWindow.markFresh();
        }
        try {
          const result=await operation();
          const changed=keys.some(key=>storage.getItem(storageKey(key))!==JSON.stringify(state[key]));
          if(changed) {
            const next={...state};for(const key of keys) next[key]=JSON.parse(storage.getItem(storageKey(key))!);
            state=await send('PUT',{state:next,previousRevision:state.revision}); hydrate(state);
            cachedState = state; readWindow.markFresh();
          }
          return result;
        } catch(error) {hydrate(state);readWindow.invalidate();throw error;}
      });
      queue=task.catch(()=>{ readWindow.invalidate(); });
      return task;
    },
  };
}
