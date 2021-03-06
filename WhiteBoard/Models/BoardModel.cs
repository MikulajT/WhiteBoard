﻿using System.Collections.Generic;

namespace WhiteBoard.Models
{
    public class BoardModel
    {
        public string BoardId { get; set; }
        public string Name { get; set; }
        public string UniqueName { get; set; }
        public int Pin { get; set; }
        public List<UserModel> Users { get; set; }
        public List<string> ImageIds { get; set; }
    }
}
