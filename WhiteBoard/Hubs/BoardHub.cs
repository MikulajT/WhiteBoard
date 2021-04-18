using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using WhiteBoard.Models;

namespace WhiteBoard.Hubs
{
    public class BoardHub : Hub
    {
        readonly private IBoardRepository repository;
        readonly private IBoardService service;

        public BoardHub(IBoardRepository boardRepository, IBoardService boardService)
        {
            repository = boardRepository;
            service = boardService;
        }

        #region Messages to client

        /// <summary>
        /// Po připojení přiřadí uživatele ke skupině. Pokud skupina ještě neexistuje, tak ji vytvoří.
        /// </summary>
        /// <param name="groupName"></param>
        public async Task StartUserConnection(string groupName)
        {
            UserModel user = new UserModel()
            {
                UserId = Guid.NewGuid().ToString(),
                Username = "Anonymous",
                Role = UserRole.Editor,
                UserConnectionId = Context.ConnectionId
            };
            BoardModel board;
            bool boardExisted = true;
            if ((board = repository.FindBoardById(groupName)) == null)
            {
                board = CreateBoard(groupName);
                boardExisted = false;
                user.Role = UserRole.Creator;
            }
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            repository.AddUserToBoard(board, user);
            if (boardExisted && board.Name != "")
            {
                await Clients.Client(Context.ConnectionId).SendAsync("changeBoardname", board.Name);
            }
            UserModel creator = repository.FindBoardCreator(groupName);
            await Clients.Client(Context.ConnectionId).SendAsync("addUsersToList", JsonSerializer.Serialize(board.Users), true);
            if (creator.UserConnectionId != Context.ConnectionId)
            {
                await Clients.Client(creator.UserConnectionId).SendAsync("addUsersToList", JsonSerializer.Serialize(new List<UserModel>() { user }), false);
            }
            await Clients.GroupExcept(groupName, Context.ConnectionId, creator.UserConnectionId).SendAsync("addUsersToList", JsonSerializer.Serialize(new List<UserModel>() { user }), true);
        }

        /// <summary>
        /// Ukončení spojení uživatele
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception exception)
        {
            BoardModel board = repository.FindBoardByUserConnectionId(Context.ConnectionId);
            if (board != null)
            {
                UserModel user = repository.FindUserByConnectionId(board.BoardId, Context.ConnectionId);
                await Clients.Group(board.BoardId).SendAsync("removeUserFromList", user.UserId);
                board.Users.Remove(repository.FindUserById(board.BoardId, user.UserId));
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
            repository.ChangeBoardname(groupName, changedBoardname);
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("changeBoardname", changedBoardname);
        }

        /// <summary>
        /// Příkaz ke změně přezdívky uživatele
        /// </summary>
        public async Task ChangeUsername(string changedUsername, string groupName)
        {
            UserModel user = repository.FindUserByConnectionId(groupName, Context.ConnectionId);
            user.Username = changedUsername;
            await Clients.Group(groupName).SendAsync("changeUsername", user.Username, user.UserId);
        }

        public async Task ChangeUserRole(string userId, string role, string groupName)
        {
            UserModel user = repository.FindUserById(groupName, userId);
            user.Role = (UserRole)Enum.Parse(typeof(UserRole), role);
            await Clients.Client(user.UserConnectionId).SendAsync("changeUserRole", userId, user.Role.ToString());
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

        #endregion

        #region Hub logic

        private BoardModel CreateBoard(string groupName)
        {
            BoardModel board = new BoardModel()
            {
                BoardId = groupName,
                Name = "",
                Pin = service.GenerateRoomPin(1000, 9999),
                Users = new List<UserModel>()
            };
            repository.AddBoard(board);
            return board;
        }

        #endregion
    }
}
