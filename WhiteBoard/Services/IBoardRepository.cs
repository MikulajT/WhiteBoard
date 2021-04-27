namespace WhiteBoard.Models
{
    public interface IBoardRepository
    {
        void AddBoard(BoardModel board);
        void AddUser(BoardModel board, UserModel user);
        BoardModel FindBoardById(string boardId);
        UserModel FindUserById(BoardModel board, string userId);
        UserModel FindUserByConnectionId(BoardModel board, string userConnectionId);
        UserModel FindBoardCreator(string boardId);
        BoardModel FindBoardByName(string name);
        BoardModel FindBoardByUniqueName(string uname);
        BoardModel FindBoardByUserConnectionId(string userConnectionId);
        void RemoveBoard(BoardModel board);
        void ChangeBoardname(string boardId, string changedBoardname);
        bool CompareBoardByPin(string boardId, int pin);
    }
}
