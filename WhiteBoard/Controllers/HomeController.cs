﻿using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using WhiteBoard.Models;

namespace WhiteBoard.Controllers
{
    public class HomeController : Controller
    {
        readonly IBoardService boardService;
        public HomeController(IBoardService boardService)
        {
            this.boardService = boardService;
        }

        public IActionResult Index()
        {
            ViewBag.boardId = boardService.GenerateBoardId();
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
