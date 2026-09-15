package com.shichuang.manage.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.api.ApiResponse;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Component
public class LocalAuthFilter extends OncePerRequestFilter {
    @Value("${spring.profiles.active:dev}") private String activeProfile;
    private final TokenService tokens; private final AuthService auth; private final ObjectMapper mapper;
    @Autowired public LocalAuthFilter(TokenService tokens, AuthService auth, ObjectMapper mapper) { this.tokens=tokens; this.auth=auth; this.mapper=mapper; }
    public LocalAuthFilter(TokenService tokens, ObjectMapper mapper) { this.tokens=tokens; this.auth=null; this.mapper=mapper; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return !uri.startsWith("/api/")
            || uri.equals("/api/auth/dev-accounts")
            || uri.equals("/api/auth/dev-login")
            || uri.equals("/api/auth/login")
            || uri.equals("/api/auth/bootstrap-password");
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        try {
            if ("OPTIONS".equalsIgnoreCase(request.getMethod())) { chain.doFilter(request, response); return; }
            String header=request.getHeader("Authorization");
            if(header==null||!header.startsWith("Bearer ")) { write(response,401,"UNAUTHORIZED","请先登录"); return; }
            Map<String,Object> session=tokens.verify(header.substring(7));
            if (auth != null && activeProfile.contains("prod")) auth.validateSession(session);
            RequestContext.set(session);
            String uri=request.getRequestURI();
            String module=uri.startsWith("/api/crm")?"crm":uri.startsWith("/api/okr")?"okr":(uri.startsWith("/api/requirements")||uri.startsWith("/api/product")||uri.startsWith("/api/work-items")||uri.startsWith("/api/bugs")||uri.startsWith("/api/dev-tasks")||uri.startsWith("/api/design-tasks")||uri.startsWith("/api/business-tasks"))?"product":null;
            if(module!=null) { if("GET".equalsIgnoreCase(request.getMethod()) || "HEAD".equalsIgnoreCase(request.getMethod())) AuthorizationService.requireRead(module); else AuthorizationService.requireWrite(module); }
            request.setAttribute("session",session);
            try { chain.doFilter(request,response); }
            finally { RequestContext.clear(); }
        } catch (IllegalArgumentException error) { write(response,401,"UNAUTHORIZED",error.getMessage()); }
          catch (org.springframework.web.server.ResponseStatusException error) { write(response,error.getStatusCode().value(),"FORBIDDEN",error.getReason()==null?"当前角色无权执行该操作":error.getReason()); }
    }
    private void write(HttpServletResponse response,int status,String code,String message) throws IOException { response.setStatus(status); response.setCharacterEncoding(java.nio.charset.StandardCharsets.UTF_8.name()); response.setContentType(MediaType.APPLICATION_JSON_VALUE); mapper.writeValue(response.getWriter(),new ApiResponse<>(code,message,null,java.util.UUID.randomUUID().toString())); }
}
