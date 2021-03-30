using Microsoft.AspNetCore.SignalR;
using System.Collections.Generic;
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

        /// <summary>
        /// Po připojení přiřadí uživatele ke skupině. Pokud skupina ještě neexistuje, tak ji vytvoří.
        /// </summary>
        /// <param name="groupName"></param>
        public async Task AddUserToGroup(string groupName)
        {
            if (repository.FindBoardById(groupName) == null)
            {
                repository.AddBoard(new BoardModel()
                {
                    BoardId = groupName,
                    Name = "TODO",
                    Pin = service.GenerateRoomPin(1000, 9999),
                    Users = new List<UserModel>()
                });
            }
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            repository.AddUser(groupName, new UserModel()
            {
                UserId = Context.ConnectionId,
                Username = "TODO",
                Role = UserRole.Editor,
            });
        }

        /// <summary>
        /// Příkaž k načtení canvasu z JSONu
        /// </summary>
        public async Task LoadCanvas(string canvas, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("loadCanvas", canvas);
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
    }
}
