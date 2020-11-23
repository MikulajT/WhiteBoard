﻿using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using WhiteBoard.Models;

namespace WhiteBoard.Controllers
{
    public class HomeController : Controller
    {
        RoomService boardService;
        public HomeController(RoomService boardService)
        {
            this.boardService = boardService;
        }

        public IActionResult Index()
        {
            ViewBag.roomId = boardService.GenerateRoomId();
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
