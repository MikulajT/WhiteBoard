using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MimeKit;
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using WhiteBoard.Hubs;
using WhiteBoard.Models;

namespace WhiteBoard.Controllers
{
    public class BoardController : Controller
    {
        private IHubContext<BoardHub> HubContext { get; set; }
        private readonly IWebHostEnvironment _hostEnvironment;
        readonly IBoardRepository boardRepository;

        public BoardController(IHubContext<BoardHub> hubcontext,
                               IWebHostEnvironment environment,
                               IBoardRepository boardRepository)
        {
            HubContext = hubcontext;
            _hostEnvironment = environment;
            this.boardRepository = boardRepository;
        }

        [Route("Board/{boardId}")]
        public IActionResult Board(string boardId)
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        /// <summary>
        /// Uploadne image na server a pokud je počet souborů v adresáři větši než 10, 
        /// tak uvolní místo odebráním nejstaršího souboru
        /// </summary>
        [HttpPost]
        public void UploadImage()
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
                string imagePath = $"{Request.Scheme}://{Request.Host}/uploadedImages/{newFileName}";
                HubContext.Clients.Group(Request.Form["group"]).SendAsync("importImage", imagePath, Guid.NewGuid().ToString());
                string wwwrootAbsolutePath = _hostEnvironment.WebRootPath + "\\uploadedImages";
                if (Directory.GetFiles(wwwrootAbsolutePath).Length >= 10)
                {
                    FileSystemInfo fileInfo = new DirectoryInfo(wwwrootAbsolutePath).GetFileSystemInfos().OrderBy(fi => fi.CreationTime).First();
                    System.IO.File.Delete(fileInfo.FullName);
                }
            }
        }

        public IActionResult SendEmail(EmailForm form)
        {
            BoardModel board = boardRepository.FindBoardById(form.Link.Split('/').Last());
            string URL = "https://localhost:44313/Access/" + board.UniqueName;

            using (var smtp = new SmtpClient("smtp.gmail.com", 587))
            {
                //smtp.ServerCertificateValidationCallback = (s,c,h,e) => true;
                smtp.EnableSsl = true;
                smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
                smtp.UseDefaultCredentials = false;
                smtp.Credentials = new NetworkCredential("whiteboardvsb@gmail.com", "Jednadva3");
                MailMessage message = new MailMessage();
                message.To.Add(new MailAddress("marek.bauer123@gmail.com"));
                message.From = new MailAddress("whiteboardvsb@gmail.com");
                message.Subject = "Invite to WhiteBoard session!";

                if (form.Pin)
                {
                    message.Body = "Join whiteboard session here: \n" +
                            URL +
                            "\nConnect with pincode: " + board.Pin.ToString();
                }
                else
                {
                    message.Body = "Join whiteboard session here: \n" +
                        form.Link;
                }

                smtp.Send(message);
            }

            return RedirectToAction("Board", new { boardId = board.BoardId});
        }
        [Route("Access/{boardUName}")]
        public IActionResult Access(string boardUName)
        {
            return View();
        }

        public IActionResult VerifyPin(PinForm form)
        {
            string URL = "https://localhost:44313/Board/";
            string name = form.Link.Split('/').Last();

            if (ModelState.IsValid)
            {
                int pin = int.Parse(form.p1.ToString() + form.p2.ToString() + form.p3.ToString() + form.p4.ToString());
                BoardModel board = boardRepository.FindBoardByUniqueName(name);

                if (board != null)
                {
                    if (boardRepository.CompareBoardByPin(board.BoardId, pin))
                    {
                        return Redirect(URL + board.BoardId);
                    }
                    else
                    {
                        TempData["error"] = "Wrong pin.";
                    }
                }
                else
                {
                    TempData["error"] = "Wrong link.";
                }
            }
            else
            {
                TempData["error"] = "Wrong fromat.";
            }
            return RedirectToAction("Access", new { boardUName = name });
        }

    }
}
