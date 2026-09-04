package com.shichuang.manage.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.api.ApiResponse;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Component
@Profile("local")
public class LocalAuthFilter extends OncePerRequestFilter {
    private final TokenService tokens; private final ObjectMapper mapper;
    public LocalAuthFilter(TokenService tokens, ObjectMapper mapper) { this.tokens=tokens; this.mapper=mapper; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return !uri.startsWith("/api/")
            || uri.equals("/api/auth/dev-accounts")
            || uri.equals("/api/auth/dev-login");
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        try {
            if ("OPTIONS".equalsIgnoreCase(request.getMethod())) { chain.doFilter(request, response); return; }
            String header=request.getHeader("Authorization");
            if(header==null||!header.startsWith("Bearer ")) { write(response,401,"UNAUTHORIZED","请先登录"); return; }
            Map<String,Object> session=tokens.verify(header.substring(7));
            String role=String.valueOf(session.get("role"));
            boolean productPath = request.getRequestURI().startsWith("/api/requirements") || request.getRequestURI().startsWith("/api/product");
            boolean crmPath = request.getRequestURI().startsWith("/api/crm");
            boolean canWrite = Set.of("admin", "sales_director", "product_manager", "tech_lead").contains(role);
            if (productPath && !Set.of("admin", "product_manager", "tech_lead", "product", "tech").contains(role)) { write(response,403,"FORBIDDEN","当前角色无权访问产品数据"); return; }
            if (crmPath && !Set.of("admin", "sales_director", "sales", "product_manager", "tech_lead").contains(role)) { write(response,403,"FORBIDDEN","当前角色无权访问客户数据"); return; }
            if (!Set.of("admin", "sales_director", "product_manager", "tech_lead", "sales", "product", "tech").contains(role)) {
                write(response,403,"FORBIDDEN","当前角色无权访问工作空间"); return;
            }
            if(!"GET".equalsIgnoreCase(request.getMethod()) && (!canWrite || (crmPath && !Set.of("admin", "sales_director").contains(role)) || (productPath && !Set.of("admin", "product_manager", "tech_lead").contains(role)))) { write(response,403,"FORBIDDEN","当前角色无权修改需求或 CRM 数据"); return; }
            request.setAttribute("session",session);
            RequestContext.set(session);
            try { chain.doFilter(request,response); }
            finally { RequestContext.clear(); }
        } catch (IllegalArgumentException error) { write(response,401,"UNAUTHORIZED",error.getMessage()); }
    }
    private void write(HttpServletResponse response,int status,String code,String message) throws IOException { response.setStatus(status); response.setCharacterEncoding(java.nio.charset.StandardCharsets.UTF_8.name()); response.setContentType(MediaType.APPLICATION_JSON_VALUE); mapper.writeValue(response.getWriter(),new ApiResponse<>(code,message,null,java.util.UUID.randomUUID().toString())); }
}
