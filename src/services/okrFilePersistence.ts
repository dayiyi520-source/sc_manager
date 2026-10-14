import { mockStateEndpoint } from './mockStateEndpoint';
import type { OkrFileState } from '../../scripts/mock-okr-state-plugin';
const keys = ['okrRecords','okrPeople','okrSettings'] as const;
const storageKey = (key: string) => `shichuang.frontend.mock.${key}`;
const migrationKey='shichuang.frontend.mock.okrFileMigration.v1';
export function createOkrFilePersistence(storage: Storage, request: typeof fetch = fetch) {
  let queue: Promise<unknown> = Promise.resolve();
  const transfer = async (init?: RequestInit): Promise<OkrFileState> => {
    const response=await request(mockStateEndpoint('okr-state'),init);
    const result=await response.json();
    if(!response.ok) throw new Error(result.message || '目标与复盘 Mock 保存失败');
    return result;
  };
  const send = (method: string, data: unknown) => transfer({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const hydrate = (state: OkrFileState) => keys.forEach(key=>storage.setItem(storageKey(key),JSON.stringify(state[key])));
  return {
    run<T>(operation: () => Promise<T>): Promise<T> {
      const task=queue.then(async()=>{
        let state=await transfer();
        if(!storage.getItem(migrationKey)) {
          const legacy: Partial<OkrFileState>={};
          for(const key of keys) {const raw=storage.getItem(storageKey(key));if(raw) legacy[key]=JSON.parse(raw);}
          if(Object.keys(legacy).length) state=await send('POST',{legacy,previousRevision:state.revision});
          storage.setItem(migrationKey,'done');
        }
        hydrate(state);
        try {
          const result=await operation();
          const changed=keys.some(key=>storage.getItem(storageKey(key))!==JSON.stringify(state[key]));
          if(changed) {
            const next={...state};for(const key of keys) next[key]=JSON.parse(storage.getItem(storageKey(key))!);
            state=await send('PUT',{state:next,previousRevision:state.revision}); hydrate(state);
          }
          return result;
        } catch(error) {hydrate(state);throw error;}
      });
      queue=task.catch(()=>undefined);
      return task;
    },
  };
}
