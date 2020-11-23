using Microsoft.AspNetCore.SignalR;
using System.Linq;
using System.Threading.Tasks;

namespace WhiteBoard.Hubs
{
    //Context.ConnectionId; 
    public class DrawDotHub : Hub
    {
    /// <summary>
    /// Po připojení přiřadí uživatele ke skupine
    /// </summary>
    /// <param name="groupName"></param>
    /// <returns></returns>
        public async Task AddUserToGroup(string groupName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }
        /// <summary>
        /// Příkaž k vyčištění canvasu pro všechny uživatele
        /// </summary>
        /// <returns></returns>
        public async Task ClearCanvas(string groupName)
        {
            //System.Console.WriteLine(Context.ConnectionId);
            await Clients.Group(groupName).SendAsync("clearCanvas");
        }
        /// <summary>
        /// Příkaž k přidání objektu do canvasu pro všechny uživatele kromě odesilatele
        /// </summary>
        /// <returns></returns>
        public async Task AddObject(string jsonData, string groupName)
        {
            await Clients.Group(groupName).SendAsync("addObject", jsonData);
        }
        /// <summary>
        /// Příkaž k odebrání objektů z canvasu pro všechny uživatele kromě odesilatele
        /// </summary>
        /// <returns></returns>
        public async Task DeleteObjects(int[] objectIds, string groupName)
        {
            await Clients.Group(groupName).SendAsync("deleteObjects", objectIds);
        }
    }
}
