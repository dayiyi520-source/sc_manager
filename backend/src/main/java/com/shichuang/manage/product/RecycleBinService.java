package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class RecycleBinService {
    private final RecycleBinMapper mapper;
    private final WorkItemAccess access;
    public RecycleBinService(RecycleBinMapper mapper,WorkItemAccess access){this.mapper=mapper;this.access=access;}

    public List<Map<String,Object>> list(String lineId){access.check(lineId,false);return mapper.list(RequestContext.tenantId(),lineId);}

    @Transactional public void restore(String lineId,String id,int revision){
        access.check(lineId,true);
        Map<String,Object> item=requireDeleted(lineId,id);
        if(item.get("parentWorkItemId")!=null&&!mapper.activeItemExists(RequestContext.tenantId(),lineId,item.get("parentWorkItemId").toString()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"请先恢复该子任务所属的主任务");
        if(mapper.restore(RequestContext.tenantId(),lineId,id,revision,RequestContext.userId())!=1) throw conflict();
    }

    @Transactional public void purge(String lineId,String id,int revision){
        access.check(lineId,true);
        requireDeleted(lineId,id);
        if(mapper.hasChildren(RequestContext.tenantId(),lineId,id)) throw new ResponseStatusException(HttpStatus.CONFLICT,"请先彻底删除该任务下的子任务");
        mapper.purgeRelations(RequestContext.tenantId(),lineId,id);
        if(mapper.purge(RequestContext.tenantId(),lineId,id,revision)!=1) throw conflict();
    }

    private Map<String,Object> requireDeleted(String lineId,String id){Map<String,Object> item=mapper.deleted(RequestContext.tenantId(),lineId,id);if(item==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"回收站记录不存在");return item;}
    private ResponseStatusException conflict(){return new ResponseStatusException(HttpStatus.CONFLICT,"记录已被其他人处理，请刷新后重试");}
}
