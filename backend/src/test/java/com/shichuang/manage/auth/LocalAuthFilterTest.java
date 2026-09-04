package com.shichuang.manage.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class LocalAuthFilterTest {
    private static final String SECRET = "test-token-secret";

    private TokenService tokens;
    private LocalAuthFilter filter;

    @BeforeEach
    void setUp() {
        ObjectMapper mapper = new ObjectMapper();
        tokens = new TokenService(mapper, SECRET);
        filter = new LocalAuthFilter(tokens, mapper);
    }

    @Test
    void rejectsProtectedRequestWithoutBearerToken() throws ServletException, IOException {
        MockHttpServletRequest request = request("/api/requirements");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("UNAUTHORIZED"));
        assertTrue(response.getContentAsString().contains("请先登录"));
        assertEquals("UTF-8", response.getCharacterEncoding());
    }

    @Test
    void allowsAuthenticatedReadRequestAndExposesSession() throws ServletException, IOException {
        MockHttpServletRequest request = request("/api/requirements");
        request.addHeader("Authorization", "Bearer " + tokens.issue("user-1", "admin"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        assertNotNull(request.getAttribute("session"));
        assertNotNull(chain.getRequest());
    }

    @Test
    void allowsDevelopmentLoginWithoutAuthentication() throws ServletException, IOException {
        MockHttpServletRequest request = request("/api/auth/dev-login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    @Test
    void blocksSalesRoleFromWritingProductData() throws ServletException, IOException {
        MockHttpServletRequest request = request("/api/requirements");
        request.setMethod("POST");
        request.addHeader("Authorization", "Bearer " + tokens.issue("user-1", "sales"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("FORBIDDEN"));
    }

    @Test
    void exposesConfiguredTenantWithoutHardCodingRequestContext() throws ServletException, IOException {
        MockHttpServletRequest request = request("/api/requirements");
        request.addHeader("Authorization", "Bearer " + tokens.issue("user-1", "admin", "tenant-b", "管理员"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        assertEquals(200, response.getStatus());
        assertEquals("tenant-b", ((java.util.Map<?, ?>) request.getAttribute("session")).get("tenant"));
    }

    private static MockHttpServletRequest request(String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI(uri);
        request.setMethod("GET");
        return request;
    }
}
