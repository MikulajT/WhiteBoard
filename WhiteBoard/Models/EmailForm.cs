using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace WhiteBoard.Models
{
    public class EmailForm
    {
        [Required]
        [Display(Name = "Email")]
        public string Email { get; set; }
        public string Link { get; set; }
    }
}
