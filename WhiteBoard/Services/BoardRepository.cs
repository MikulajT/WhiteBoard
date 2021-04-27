using System;
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
            if (boards.Count == 0)
            {
                board.UniqueName = "Board0";
            }
            else
            {
                int n = Int32.Parse(boards[(boards.Count - 1)].UniqueName.Split("Board")[1]);
                n++;
                board.UniqueName = "Board" + n.ToString();
            }

            boards.Add(board);
        }

        public void AddUser(BoardModel board, UserModel user)
        {
            board.Users.Add(user);
        }

        /// <summary>
        /// Vyhledá tabuli podle id
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public BoardModel FindBoardById(string boardId)
        {
            return ((List<BoardModel>)boards).Find(x => x.BoardId == boardId);
        }

        public UserModel FindUserById(BoardModel board, string userId)
        {
            return board.Users.Find(x => x.UserId == userId);
        }

        public UserModel FindUserByConnectionId(BoardModel board, string userConnectionId)
        {
            foreach (var user in board.Users)
            {
                foreach (var connectionId in user.UserConnectionIds)
                {
                    if (connectionId == userConnectionId)
                    {
                        return user;
                    }
                }
            }
            return null;
        }

        public UserModel FindBoardCreator(string boardId)
        {
            return FindBoardById(boardId).Users.Find(x => x.Role == UserRole.Creator);
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

        public BoardModel FindBoardByUniqueName(string uname)
        {
            return ((List<BoardModel>)boards).Find(x => x.UniqueName == uname);
        }

        public BoardModel FindBoardByUserConnectionId(string userConnectionId)
        {
            foreach (var board in boards)
            {
                foreach (var user in board.Users)
                {
                    foreach (var connectionId in user.UserConnectionIds)
                        if (connectionId == userConnectionId)
                        {
                            return board;
                        }
                }
            }
            return null;
        }

        public void RemoveBoard(BoardModel board)
        {
            boards.Remove(board);
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
