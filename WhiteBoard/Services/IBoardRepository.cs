namespace WhiteBoard.Models
{
    public interface IBoardRepository
    {
        void AddBoard(BoardModel board);
        void AddUser(string boardId, UserModel user);
        BoardModel FindBoardById(string id);
        BoardModel FindBoardByName(string name);
        bool CompareBoardByPin(string boardId, int pin);
    }
}
