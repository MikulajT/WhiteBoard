using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WhiteBoard.Models
{
    public class UserModel
    {
        [JsonPropertyName("userId")]
        public string UserId { get; set; }

        [JsonPropertyName("username")]
        public string Username { get; set; }

        [JsonPropertyName("role")]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public UserRole Role { get; set; }

        [JsonIgnore]
        public List<BoardModel> Boards { get; set; }

        [JsonIgnore]
        public List<string> UserConnectionIds { get; set; }

        [JsonIgnore]
        public bool IsActive
        {
            get
            {
                return UserConnectionIds.Count > 0;
            }
        }
    }

    public enum UserRole
    {
        Creator,
        Editor,
        Reader
    }
}
