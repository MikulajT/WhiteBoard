namespace WhiteBoard.Models
{
    public interface IBoardService
    {
        BoardModel CreateBoard(string groupName);
        int GenerateRoomPin(int valueFrom, int valueTo);
        string GenerateBoardId();
    }
}
