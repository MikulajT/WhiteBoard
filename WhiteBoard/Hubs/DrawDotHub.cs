using Microsoft.AspNetCore.SignalR;
using System.Linq;
using System.Threading.Tasks;

namespace WhiteBoard.Hubs
{
    public class DrawDotHub : Hub
    {
        public async Task ClearCanvas()
        {
            await Clients.All.SendAsync("clearCanvas");
        }
    }
}
