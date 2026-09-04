package com.shichuang.manage.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@Profile("local")
public class WebConfig implements WebMvcConfigurer {
    @Override public void addCorsMappings(CorsRegistry registry) {
        // Local development may be opened from another computer on the same LAN.
        // Keep this permissive rule local-only; production profiles do not load it.
        registry.addMapping("/api/**").allowedOriginPatterns("*").allowedMethods("GET","POST","PUT","PATCH","DELETE","OPTIONS").allowCredentials(true);
    }
}
