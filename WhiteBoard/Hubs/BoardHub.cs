using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR;
using ReturnTrue.AspNetCore.Identity.Anonymous;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using WhiteBoard.Models;

namespace WhiteBoard.Hubs
{
    public class BoardHub : Hub
    {
        readonly private IBoardRepository _boardRepository;
        private readonly IWebHostEnvironment _hostEnvironment;

        public BoardHub(IBoardRepository boardRepository, IWebHostEnvironment environment)
        {
            _boardRepository = boardRepository;
            _hostEnvironment = environment;
        }

        /// <summary>
        /// Inicializace připojení uživatele.
        /// </summary>
        /// <param name="groupName"></param>
        public async Task StartUserConnection(string groupName)
        {
            BoardModel board;
            UserModel user;
            bool boardExisted = true;
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            string userId = ((IAnonymousIdFeature)Context.GetHttpContext().Features[typeof(IAnonymousIdFeature)]).AnonymousId;
            if ((board = _boardRepository.FindBoardById(groupName)) == null)
            {
                board = _boardRepository.CreateBoard(groupName);
                _boardRepository.AddBoard(board);
                boardExisted = false;
            }
            if ((user = _boardRepository.FindUserById(board, userId)) == null)
            {
                user = _boardRepository.CreateUser(userId, Context.ConnectionId, board, boardExisted);
                _boardRepository.AddUser(board, user);
            }
            else
            {
                user.UserConnectionIds.Add(Context.ConnectionId);
                if (user.Role == UserRole.Reader)
                {
                    await Clients.Client(Context.ConnectionId).SendAsync("changeUserRole", "Reader");
                }
            }
            UserModel creator = _boardRepository.FindBoardCreator(groupName);
            string creatorId = creator == null ? null : creator.UserId;
            var creatorConnectionIds = creator == null ? null : creator.UserConnectionIds;
            await Clients.Client(Context.ConnectionId)
            .SendAsync("addUsersToList", JsonSerializer.Serialize(board.Users.Where(user => user.IsActive)), user.Role != UserRole.Creator);
            if (creatorId != user.UserId)
            {
                if (user.UserConnectionIds.Count == 1)
                {
                    await Clients.Clients(creatorConnectionIds).SendAsync("addUsersToList", JsonSerializer.Serialize(new List<UserModel>() { user }), false);
                }
                await Clients.Clients(Context.ConnectionId).SendAsync("disableBoardNameChange");
            }
            await Clients.GroupExcept(groupName, user.UserConnectionIds.Concat(creatorConnectionIds).ToList())
                  .SendAsync("addUsersToList", JsonSerializer.Serialize(new List<UserModel>() { user }), true);
            if (boardExisted && board.Name != "")
            {
                await Clients.Client(Context.ConnectionId).SendAsync("changeBoardname", board.Name);
            }
        }

        /// <summary>
        /// Ukončení spojení uživatele
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception exception)
        {
            BoardModel board = _boardRepository.FindBoardByUserConnectionId(Context.ConnectionId);
            if (board != null)
            {
                UserModel user = _boardRepository.FindUserByConnectionId(board, Context.ConnectionId);
                user.UserConnectionIds.Remove(Context.ConnectionId);
                if (user.UserConnectionIds.Count == 0)
                {
                    await Clients.Group(board.BoardId).SendAsync("removeUserFromList", user.UserId);
                }
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, board.BoardId);
                if (_boardRepository.isBoardEmpty(board))
                {
                    //odstran vsechny obrazky na zanikle tabuli
                    string wwwrootAbsolutePath = _hostEnvironment.WebRootPath + "\\uploadedImages";
                    FileSystemInfo[] fileInfo = new DirectoryInfo(wwwrootAbsolutePath).GetFileSystemInfos();
                    foreach (FileSystemInfo myFile in fileInfo)
                    {
                        if (board.ImageIds.Contains(myFile.Name))
                        {
                            File.Delete(myFile.FullName);
                        }
                    }
                    _boardRepository.RemoveBoard(board);
                }
            }
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Příkaž k načtení canvasu z JSONu
        /// </summary>
        public async Task LoadCanvas(string canvas, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("loadCanvas", canvas);
        }

        /// <summary>
        /// Příkaz ke změně názvu tabule
        /// </summary>
        public async Task ChangeBoardname(string changedBoardname, string groupName)
        {
            _boardRepository.ChangeBoardname(groupName, changedBoardname);
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("changeBoardname", changedBoardname);
        }

        /// <summary>
        /// Příkaz ke změně přezdívky uživatele
        /// </summary>
        public async Task ChangeUsername(string changedUsername, string groupName)
        {
            BoardModel board = _boardRepository.FindBoardById(groupName);
            UserModel user = _boardRepository.FindUserByConnectionId(board, Context.ConnectionId);
            user.Username = changedUsername;
            await Clients.Group(groupName).SendAsync("changeUsername", user.Username, user.UserId);
        }

        public async Task ChangeUserRole(string userId, string role, string groupName)
        {
            BoardModel board = _boardRepository.FindBoardById(groupName);
            UserModel user = _boardRepository.FindUserById(board, userId);
            user.Role = (UserRole)Enum.Parse(typeof(UserRole), role);
            await Clients.Clients(user.UserConnectionIds).SendAsync("changeUserRole", user.Role.ToString());
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("changeUserRoleInList", userId, user.Role.ToString());
        }

        /// <summary>
        /// Příkaž k vyčištění canvasu
        /// </summary>
        public async Task ClearCanvas(string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("clearCanvas");
        }

        /// <summary>
        /// Příkaž k přidání objektu do canvasu
        /// </summary>
        public async Task AddObjects(string jsonData, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("addObjects", jsonData);
        }

        /// <summary>
        /// Příkaž k odebrání objektů z canvasu
        /// </summary>
        public async Task DeleteObjects(string objectsId, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("deleteObjects", objectsId);
        }

        /// <summary>
        /// Příkaz ke změně pozice objektů
        /// </summary>
        public async Task ModifyObjects(string jsonData, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("modifyObjects", jsonData);
        }

        /// <summary>
        /// Příkaz k přesunutí objektů do horní nebo spodní vrstvy canvasu
        /// </summary>
        public async Task MoveObjectsStack(string objectsId, string frontOrBack, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("moveObjectsStack", objectsId, frontOrBack);
        }

        /// <summary>
        /// Příkaz ke vložení vygenerovaného html kódu na stránku
        /// </summary>
        public async Task AppendHtmlCode(string actionType, string objectType, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("appendHtmlCode", actionType, objectType);
        }

        /// <summary>
        /// Příkaz k vložení obrázků na canvas
        /// </summary>
        public async Task ImportImages(string images, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("importImages", images);
        }
    }
}
