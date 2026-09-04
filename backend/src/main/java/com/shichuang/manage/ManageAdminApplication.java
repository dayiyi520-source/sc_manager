package com.shichuang.manage;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ManageAdminApplication {
    public static void main(String[] args) { SpringApplication.run(ManageAdminApplication.class, args); }
}
