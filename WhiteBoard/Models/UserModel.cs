namespace WhiteBoard.Models
{
    public class UserModel
    {
        public string UserId { get; set; }
        public string Username { get; set; }
        public UserRole Role { get; set; }
    }

    public enum UserRole
    {
        Editor,
        Reader
    }
}
