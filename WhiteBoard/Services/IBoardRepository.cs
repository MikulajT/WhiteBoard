namespace WhiteBoard.Models
{
    public interface IBoardRepository
    {
        BoardModel CreateBoard(string groupName);
        void AddBoard(BoardModel board);
        UserModel CreateUser(string userId, string userConnectionId, BoardModel board, bool boardExisted);
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
        bool isBoardEmpty(BoardModel board);
    }
}
