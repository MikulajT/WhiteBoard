using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using WhiteBoard.Hubs;
using WhiteBoard.Models;

namespace WhiteBoard.Controllers
{
    public class RoomController : Controller
    {
        private IHubContext<BoardHub> HubContext { get; set; }
        public RoomController(IHubContext<BoardHub> hubcontext)
        {
            HubContext = hubcontext;
        }

        [Route("Board/{roomId}")]
        public IActionResult Board(string roomId)
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        [HttpPost]
        public async void UploadImage()
        {
            if (HttpContext.Request.Form.Files != null && HttpContext.Request.Form.Files[0].ContentType.Contains("image"))
            {
                var file = HttpContext.Request.Form.Files[0];
                string fileName = ContentDispositionHeaderValue.Parse(file.ContentDisposition).FileName.Trim('"');
                string myUniqueFileName = Convert.ToString(Guid.NewGuid());
                string FileExtension = Path.GetExtension(fileName);
                string newFileName = myUniqueFileName + FileExtension;
                fileName = @"wwwroot\uploadedImages\" + $"{newFileName}";
                using (FileStream fs = System.IO.File.Create(fileName))
                {
                    file.CopyTo(fs);
                }                     
                await HubContext.Clients.Group(Request.Form["group"]).SendAsync("importImage", $"{Request.Scheme}://{Request.Host}/uploadedImages/{newFileName}");             
            }
        }
    }
}
