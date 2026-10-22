// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { productRepository } from './productRepository';
import { teamRepository } from './teamRepository';
import { productReleaseFeeds, syncProductReleaseFeeds } from './productReleaseFeeds';
import { listWorkbenchFeeds } from './workbenchFeeds';
beforeEach(()=>{localStorage.clear();sessionStorage.clear();});
it('publishes a completed iteration with actual release time, persists and syncs a single product announcement',async()=>{
 const line=(await productRepository.productLines())[0];
 await productRepository.createVersion(line.id,{name:'发布验收',code:'workbench-release-test',ownerName:'管理员'});
 const created=(await productRepository.productLines()).find(item=>item.id===line.id)!.versions!.find(item=>item.code==='workbench-release-test')!;
 await expect(productRepository.updateVersion(line.id,created.id,{status:'已发布'})).rejects.toThrow('状态已变化');
 await productRepository.updateVersion(line.id,created.id,{status:'进行中'});
 await productRepository.updateVersion(line.id,created.id,{status:'已完成'});
 expect(productReleaseFeeds(await productRepository.productLines()).some(feed=>feed.versionId===created.id)).toBe(false);
 await productRepository.updateVersion(line.id,created.id,{status:'已发布'});
 const published=(await productRepository.productLines()).find(item=>item.id===line.id)!.versions!.find(item=>item.id===created.id)!;
 expect(published.status).toBe('已发布');expect(Number.isFinite(new Date(published.releaseDate!).getTime())).toBe(true);
 await productRepository.updateVersion(line.id,created.id,{status:'已发布'});
 const products=await productRepository.productLines();syncProductReleaseFeeds(products);syncProductReleaseFeeds(products);
 expect(listWorkbenchFeeds().filter(feed=>feed.versionId===created.id)).toHaveLength(1);
 expect(listWorkbenchFeeds().find(feed=>feed.versionId===created.id)?.time).toBe(published.releaseDate);
});
it('persists organization identity for members and exposes it to audience matching',async()=>{
 const created=await teamRepository.create({name:'代理商成员',organizationId:'agency',department:'产品部',jobTitle:'销售'});
 expect((await teamRepository.options()).find(person=>person.id===created.id)).toMatchObject({organizationId:'agency',department:'产品部'});
 const member=(await teamRepository.list()).find(person=>person.id===created.id)!;
 await teamRepository.update(member.id,{...member,organizationId:'shichuang',version:member.version});
 expect((await teamRepository.options()).find(person=>person.id===created.id)?.organizationId).toBe('shichuang');
});
