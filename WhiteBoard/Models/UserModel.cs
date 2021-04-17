﻿using System.Text.Json.Serialization;

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
        public string UserConnectionId { get; set; }
    }

    public enum UserRole
    {
        Creator,
        Editor,
        Reader
    }
}
