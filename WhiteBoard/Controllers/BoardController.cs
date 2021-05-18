using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text.Json;
using WhiteBoard.Hubs;
using WhiteBoard.Models;

namespace WhiteBoard.Controllers
{
    public class BoardController : Controller
    {
        private IHubContext<BoardHub> _hubContext { get; set; }
        private readonly IWebHostEnvironment _hostEnvironment;
        readonly IBoardRepository _boardRepository;

        public BoardController(IHubContext<BoardHub> hubcontext,
                               IWebHostEnvironment environment,
                               IBoardRepository boardRepository)
        {
            _hubContext = hubcontext;
            _hostEnvironment = environment;
            _boardRepository = boardRepository;
        }

        [Route("Board/{boardId}")]
        public IActionResult Board(string boardId)
        {
            if (Request.Cookies["theme"] == null)
            {
                CookieOptions cookies = new CookieOptions();
                cookies.Expires = DateTime.Now.AddDays(1);

                Response.Cookies.Append("theme", "true", cookies);
            }

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
        public IActionResult UploadImage()
        {
            if (HttpContext.Request.Form.Files != null && HttpContext.Request.Form.Files[0].ContentType.Contains("image"))
            {
                var file = HttpContext.Request.Form.Files[0];
                string fileName = ContentDispositionHeaderValue.Parse(file.ContentDisposition).FileName.Trim('"');
                string myUniqueFileName = Convert.ToString(Guid.NewGuid());
                string fileExtension = Path.GetExtension(fileName);
                string newFileName = myUniqueFileName + fileExtension;
                fileName = @"wwwroot\uploadedImages\" + $"{newFileName}";
                using (FileStream fs = System.IO.File.Create(fileName))
                {
                    file.CopyTo(fs);
                }

                //metoda na straně klienta akceptuje na vstupu kolekce, proto musíme vytvořit 2 kolekce s jedním prvkem
                string imagePath = $"{Request.Scheme}://{Request.Host}/uploadedImages/{newFileName}";
                List<string> imageIds = new List<string> { "myUniqueFileName" };

                _hubContext.Clients.Group(Request.Form["group"]).SendAsync("importImage",
                    JsonSerializer.Serialize(new[] { new { address = imagePath, id = myUniqueFileName } }));
                _boardRepository.AddImageId(Request.Form["group"], newFileName);
                return Ok(new { id = myUniqueFileName, extension = fileExtension });
            }
            return BadRequest();
        }

        public void SendEmail(EmailForm form)
        {
            BoardModel board = _boardRepository.FindBoardById(form.Link.Split('/').Last());
            string URL = "http://vsbwhiteboard.aspifyhost.cz/Access/" + board.UniqueName;

            using (var smtp = new SmtpClient("smtp.gmail.com", 587))
            {
                //smtp.ServerCertificateValidationCallback = (s,c,h,e) => true;
                smtp.EnableSsl = true;
                smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
                smtp.UseDefaultCredentials = false;
                smtp.Credentials = new NetworkCredential("whiteboardvsb@gmail.com", "Jednadva3");
                MailMessage message = new MailMessage();
                message.IsBodyHtml = true;
                message.To.Add(new MailAddress(form.Email));
                message.From = new MailAddress("whiteboardvsb@gmail.com");
                message.Subject = "Invite to WhiteBoard session!";

                if (form.Pin)
                {
                    message.Body = "<h1>Join whiteboard session here:</h1> " +
                            "<h3>" +
                            URL +
                            "</h3>" +
                            "Connect with pincode: <b>" + board.Pin.ToString() + "</b>";
                }
                else
                {
                    message.Body = "<h1>Join whiteboard session here:</h1>" +
                        "<h3>http://vsbwhiteboard.aspifyhost.cz" + form.Link + "</h3>";
                }

                smtp.Send(message);
            }
        }
        [Route("Access/{boardUName}")]
        public IActionResult Access(string boardUName)
        {
            return View();
        }

        public IActionResult VerifyPin(PinForm form)
        {
            string URL = "http://vsbwhiteboard.aspifyhost.cz/Board/";
            string name = form.Link.Split('/').Last();

            if (ModelState.IsValid)
            {
                int pin = int.Parse(form.p1.ToString() + form.p2.ToString() + form.p3.ToString() + form.p4.ToString());
                BoardModel board = _boardRepository.FindBoardByUniqueName(name);

                if (board != null)
                {
                    if (_boardRepository.CompareBoardByPin(board.BoardId, pin))
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


        [HttpPost]
        public IActionResult SetTheme(EmailForm form)
        {
            CookieOptions cookies = new CookieOptions();
            cookies.Expires = DateTime.Now.AddDays(1);

            Response.Cookies.Append("theme", form.Theme.ToString().ToLower(), cookies);

            return RedirectToAction("Board", new { boardId = form.Link.Split('/').Last() });
        }
    }
}
