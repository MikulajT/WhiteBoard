namespace WhiteBoard.Models
{
    public interface IBoardRepository
    {
        void AddBoard(BoardModel board);
        void AddUserToBoard(BoardModel board, UserModel user);
        void AddUserToBoard(string boardId, UserModel user);
        BoardModel FindBoardById(string id);
        UserModel FindUserById(string boardId, string userId);
        UserModel FindUserByConnectionId(string boardId, string userConnectionId);
        BoardModel FindBoardByName(string name);
        BoardModel FindBoardByUserConnectionId(string userConnectionId);
        void ChangeBoardname(string boardId, string changedBoardname);
        bool CompareBoardByPin(string boardId, int pin);
    }
}
