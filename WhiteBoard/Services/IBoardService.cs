namespace WhiteBoard.Models
{
    public interface IBoardService
    {
        int GenerateRoomPin(int valueFrom, int valueTo);
        string GenerateBoardId();
    }
}
