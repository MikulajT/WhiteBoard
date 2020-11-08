using Microsoft.AspNetCore.SignalR;
using System.Linq;
using System.Threading.Tasks;

namespace WhiteBoard.Hubs
{
    //Context.ConnectionId; 
    public class DrawDotHub : Hub
    {
        /// <summary>
        /// Příkaž k vyčištění canvasu pro všechny uživatele
        /// </summary>
        /// <returns></returns>
        public async Task ClearCanvas()
        {
            await Clients.All.SendAsync("clearCanvas");
        }
        /// <summary>
        /// Příkaž k přidání objektu do canvasu pro všechny uživatele kromě odesilatele
        /// </summary>
        /// <returns></returns>
        public async Task AddObject(string jsonData)
        {
            await Clients.Others.SendAsync("addObject", jsonData);
        }
        /// <summary>
        /// Příkaž k odebrání objektů z canvasu pro všechny uživatele kromě odesilatele
        /// </summary>
        /// <returns></returns>
        public async Task DeleteObjects(int[] objectIds)
        {
            await Clients.Others.SendAsync("deleteObjects", objectIds);
        }
    }
}
