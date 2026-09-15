package com.shichuang.manage.product;

import com.shichuang.manage.api.PageResult;
import com.shichuang.manage.auth.AuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@Service
public class TaskAliasService {
    private final TaskAliasMapper mapper;
    public TaskAliasService(TaskAliasMapper mapper) { this.mapper = mapper; }
    public TaskPageResult<Map<String,Object>> list(String type, int page, int pageSize, TaskListFilter filter) {
        AuthorizationService.requireRead("product"); int p=Math.max(1,page), s=Math.min(100,Math.max(1,pageSize)); String table=table(type), owner=owner(type);
        return new TaskPageResult<>(mapper.list(table,owner,filter,s,(p-1)*s),p,s,mapper.count(table,owner,filter),mapper.groups(table,owner,filter));
    }
    public Map<String,Object> detail(String type,String id){AuthorizationService.requireRead("product");Map<String,Object> value=mapper.detail(table(type),owner(type),id);if(value==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"工作项不存在");return value;}
    @Transactional public Map<String,Object> create(String type,Map<String,Object> body){AuthorizationService.requireWrite("product");return mapper.create(type,body);}
    @Transactional public void update(String type,String id,Map<String,Object> body){AuthorizationService.requireWrite("product");if(mapper.update(table(type),id,body)==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"工作项不存在");}
    static String table(String type){return switch(type){case "bug"->"t_product_bug";case "dev"->"t_product_dev_task";case "design"->"t_product_design_task";case "presales"->"t_crm_presales_task";case "delivery"->"t_project_delivery_task";case "ops"->"t_project_ops_task";default->throw new IllegalArgumentException("任务类型无效");};}
    static String owner(String type){return "dev".equals(type)?"developer_name_":"bug".equals(type)?"assignee_name_":"owner_name_";}
}
