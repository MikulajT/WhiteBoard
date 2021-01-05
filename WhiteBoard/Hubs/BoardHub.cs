using Microsoft.AspNetCore.SignalR;
using System.Linq;
using System.Threading.Tasks;

namespace WhiteBoard.Hubs
{
    public class BoardHub : Hub
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
        public async Task DeleteObjects(int[] objectsId, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("deleteObjects", objectsId);
        }

        /// <summary>
        /// Příkaz ke změně textu již existujícího objektu
        /// </summary>
        public async Task ChangeTextObject(int objectId, string addedChar, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("changeTextObject", objectId, addedChar);
        }

        /// <summary>
        /// Příkaz ke změně pozice objektu
        /// </summary>
        public async Task ChangeObjectPosition(int[] objectsId, double xPos, double yPos, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("changeObjectPosition", objectsId, xPos, yPos);
        }

        /// <summary>
        /// Příkaz k otočení objektu
        /// </summary>
        public async Task ChangeObjectAngle(int[] objectsId, double angle, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("changeObjectAngle", objectsId, angle);
        }

        /// <summary>
        /// Příkaz ke změně velikosti objektu
        /// </summary>
        public async Task ChangeObjectSize(int[] objectsId, string sizeProperties, string groupName)
        {
            await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync("changeObjectSize", objectsId, sizeProperties);
        }
    }
}
