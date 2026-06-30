namespace SDM.Domain.Constants
{
    public static class Roles
    {
        public const string SuperAdmin = "SuperAdmin";
        public const string Admin = "Admin";
        public const string Operator = "Operator";
        public const string Viewer = "Viewer";

        // Role groups for [Authorize(Roles = ...)]
        public const string AdminAndUp = "SuperAdmin,Admin";
        public const string OperatorAndUp = "SuperAdmin,Admin,Operator";
        public const string AllRoles = "SuperAdmin,Admin,Operator,Viewer";
    }
}
