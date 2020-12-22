using Microsoft.AspNetCore.SignalR;
using System.Linq;
using System.Threading.Tasks;

namespace WhiteBoard.Hubs
{
    public class DrawDotHub : Hub
    {

        /// <summary>
        /// Po připojení přiřadí uživatele ke skupine
        /// </summary>
        /// <param name="groupName"></param>
        public async Task AddUserToGroup(string groupName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        /// <summary>
        /// Příkaž k vyčištění canvasu pro všechny uživatele kromě odesilatele
        /// </summary>
        public async Task ClearCanvas(string groupName)
        {
            //System.Console.WriteLine(Context.ConnectionId);
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("clearCanvas");
        }

        /// <summary>
        /// Příkaž k přidání objektu do canvasu pro všechny uživatele kromě odesilatele
        /// </summary>
        public async Task AddObject(string jsonData, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("addObject", jsonData);
        }

        /// <summary>
        /// Příkaž k odebrání objektů z canvasu pro všechny uživatele kromě odesilatele
        /// </summary>
        public async Task DeleteObjects(int[] objectIds, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("deleteObjects", objectIds);
        }

        /// <summary>
        /// Změní text již existujícího objektu
        /// </summary>
        public async Task ChangeTextObject(int objectId, string addedChar, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("changeTextObject", objectId, addedChar);
        }
    }
}
