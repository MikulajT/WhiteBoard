namespace WhiteBoard.Models
{
    public interface IBoardRepository
    {
        void AddBoard(BoardModel board);
        void AddUser(string boardId, UserModel user);
        BoardModel FindBoardById(string id);
        UserModel FindUserById(string boardId, string userId);
        BoardModel FindBoardByName(string name);
        void ChangeBoardname(string boardId, string changedBoardname);
        void ChangeUsername(string boardId, string userId, string changedUsername);
        bool CompareBoardByPin(string boardId, int pin);
    }
}
