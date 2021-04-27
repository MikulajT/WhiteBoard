namespace WhiteBoard.Models
{
    public interface IBoardService
    {
        int GenerateRoomPin(int valueFrom, int valueTo);
        string GenerateBoardId();
        BoardModel CreateBoard(string groupName);
        UserModel CreateUser(string userId, string userConnectionId, BoardModel board, bool boardExisted);
        bool isBoardEmpty(BoardModel board);
    }
}
