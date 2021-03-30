using System.Collections.Generic;

namespace WhiteBoard.Models
{
    public class BoardModel
    {
        public string BoardId { get; set; }
        public string Name { get; set; }
        public int Pin { get; set; }
        public List<UserModel> Users { get; set; }
    }
}
