package com.shichuang.manage.team;

public final class TeamMemberContract {
    private TeamMemberContract() {}

    public record CreateEmployee(String name, String department, String jobTitle, String phone, String email) {}
    public record UpdateEmployee(String name, String department, String jobTitle, String phone, String email, Integer version) {}
    public record UpdateStatus(String status, Integer version) {}
    public record EmployeeView(
        String id,
        String name,
        String department,
        String jobTitle,
        String phone,
        String email,
        String status,
        boolean loginEnabled,
        int version
    ) {}
    public record EmployeeOption(
        String id,
        String username,
        String name,
        String avatar,
        String department,
        String role,
        String roleTitle,
        String jobTitle
    ) {}
}
