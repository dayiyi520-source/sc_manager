import {afterEach,expect,it,vi} from 'vitest';
import {mockStateEndpoint} from './mockStateEndpoint';
afterEach(()=>vi.unstubAllEnvs());
it('uses the project API namespace in production, including nested deployment paths',()=>{
 vi.stubEnv('DEV',false);vi.stubEnv('MODE','production');vi.stubEnv('BASE_URL','/sc-manager-frontend/');
 expect(mockStateEndpoint('okr-state')).toBe('/sc-manager-frontend/api/mock/okr-state');
 expect(mockStateEndpoint('research-template')).toBe('/sc-manager-frontend/api/mock/research-template');
});
it('retains local development endpoints',()=>{
 vi.stubEnv('DEV',true);expect(mockStateEndpoint('okr-state')).toBe('/__dev/okr-state');
});
