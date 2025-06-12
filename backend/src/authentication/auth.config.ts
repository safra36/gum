



export enum AuthLevels {
    // Project Management
    CreateProject = "creating_project",
    EditProject = "editing_project",
    DeleteProject = "delete_project",
    ViewProject = "view_project",
    
    // Execution
    ExecuteScript = "execute_script",
    ViewExecutionHistory = "view_execution_history",
    ViewExecutionLogs = "view_execution_logs",
    
    // Git Operations
    GetGitLog = "get_git_log",
    RevertCommit = "revert_commit",
    SwitchBranch = "switch_branch",
    
    // Cron Jobs
    SetCron = "set_cron",
    
    // User Management (Admin only)
    ManageUsers = "manage_users",
    ViewUsers = "view_users",
    CreateUser = "create_user",
    EditUser = "edit_user",
    DeleteUser = "delete_user",
    ManagePermissions = "manage_permissions"
}
