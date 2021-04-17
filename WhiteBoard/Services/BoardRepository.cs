using System.Collections.Generic;

namespace WhiteBoard.Models
{
    public class BoardRepository : IBoardRepository
    {
        private readonly IList<BoardModel> boards;

        public BoardRepository()
        {
            boards = new List<BoardModel>();
        }

        /// <summary>
        /// Přidá tabuly do listu
        /// </summary>
        /// <param name="board"></param>
        public void AddBoard(BoardModel board)
        {
            boards.Add(board);
        }

        /// <summary>
        /// Přidá uživatele k dané tabuli
        /// </summary>
        /// <param name="board"></param>
        /// <param name="user"></param>
        public void AddUserToBoard(BoardModel board, UserModel user)
        {
            board.Users.Add(user);
        }

        /// <summary>
        /// Přidá uživatele k dané tabuli
        /// </summary>
        /// <param name="boardId"></param>
        /// <param name="user"></param>
        public void AddUserToBoard(string boardId, UserModel user)
        {
            FindBoardById(boardId).Users.Add(user);
        }

        /// <summary>
        /// Vyhledá tabuli podle id
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public BoardModel FindBoardById(string id)
        {
            return ((List<BoardModel>)boards).Find(x => x.BoardId == id);
        }

        public UserModel FindUserById(string boardId, string userId)
        {
            return FindBoardById(boardId).Users.Find(x => x.UserId == userId);
        }

        public UserModel FindUserByConnectionId(string boardId, string userConnectionId)
        {
            return FindBoardById(boardId).Users.Find(x => x.UserConnectionId == userConnectionId);
        }

        /// <summary>
        /// Vyhledá tabuli podle jmena
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public BoardModel FindBoardByName(string name)
        {
            return ((List<BoardModel>)boards).Find(x => x.Name == name);
        }

        public BoardModel FindBoardByUserConnectionId(string userConnectionId)
        {
            foreach (var board in boards)
            {
                foreach (var user in board.Users)
                {
                    if (user.UserConnectionId == userConnectionId)
                    {
                        return board;
                    }
                }
            }
            return null;
        }

        public void ChangeBoardname(string boardId, string changedBoardname)
        {
            FindBoardById(boardId).Name = changedBoardname;
        }

        /// <summary>
        /// Porovná, zda se shoduje zadaný pin s pinem dané tabule
        /// </summary>
        /// <param name="boardId"></param>
        /// <param name="pin"></param>
        /// <returns></returns>
        public bool CompareBoardByPin(string boardId, int pin)
        {
            return pin == FindBoardById(boardId).Pin;
        }
    }
}
